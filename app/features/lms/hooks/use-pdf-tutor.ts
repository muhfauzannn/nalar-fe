import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectTutorLive,
  type LiveCloseInfo,
  type LiveServerMessage,
  type Session,
} from "../lib/live-tutor-client";
import { HttpError } from "~/lib/http";
import { aiTutorApi, type LiveSessionEvent } from "../api/ai-tutor";
import {
  classifyLiveClose,
  classifyStartError,
  DEFAULT_MAX_SESSION_MS,
  waitUntil,
} from "../lib/live-session-policy";
import { useIdleClose } from "./use-idle-close";
import { useLiveRetry } from "./use-live-retry";
import { useSessionRenewal } from "./use-session-renewal";
import type { TutorThreadMessage } from "../types";
import {
  contextForModel,
  parsePdfGuidance,
  parsePdfCursor,
  pdfGuidanceFollowsSpeech,
  type PdfCursorCue,
  type PdfGuidance,
  type PdfViewContext,
} from "../lib/pdf-tutor";
import {
  openTutorMicrophone,
  TUTOR_INPUT_MIME_TYPE,
  TutorAudioOutput,
  type TutorMicrophone,
} from "../lib/tutor-audio";

import { canPublishPdfContext, pdfOutputText, pdfQuestionContent, pdfResponseEnded } from "../lib/pdf-tutor-turn";
import { liveInputPreview } from "../lib/live-transcript";
import { SpokenCues, type CueRelease } from "../lib/spoken-cues";

// A teacher's hand reaches the spot just before the word lands, not after it.
const CUE_LEAD_SECONDS = 0.25;

type Status =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "paused"
  | "error";
export type PdfTutorEvent = {
  name: string;
  at: number;
  page?: number;
  revision?: number;
  turnId?: string;
};

export function usePdfTutor(
  resourceId: string,
  context: PdfViewContext | null,
) {
  const [status, setStatus] = useState<Status>("idle");
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<PdfGuidance | null>(null);
  // How many steps of a speech-led guidance may show so far; null when it has no spoken cues.
  const [revealedSteps, setRevealedSteps] = useState<number | null>(null);
  const [cursorCue, setCursorCue] = useState<PdfCursorCue | null>(null);
  const [pointerVisible, setPointerVisible] = useState(false);
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");
  const [listening, setListening] = useState(false);
  // Finished turns of this session, kept after it ends so the student can read them back.
  const [messages, setMessages] = useState<TutorThreadMessage[]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  // A spoken conversation: replies are played aloud. Typed questions alone get text replies.
  const [voice, setVoice] = useState(false);
  const voiceRef = useRef(false);
  const inputLevel = useRef(0);
  const pendingText = useRef<string | null>(null);
  const committedQuestion = useRef<string | null>(null);
  const contextRef = useRef(context);
  const sessionRef = useRef<Session | null>(null);
  const microphoneRef = useRef<TutorMicrophone | null>(null);
  const audioRef = useRef<TutorAudioOutput | null>(null);
  const generation = useRef(0);
  const micGeneration = useRef(0);
  const connecting = useRef(false);
  const openingMicrophone = useRef(false);
  const lastImage = useRef("");
  // Student turns, and the turn the page image was last sent on (see sendView).
  const turnCount = useRef(0);
  const imageTurn = useRef(-Infinity);
  const mounted = useRef(false);
  const playing = useRef(false);
  // A response spans tool turns, generation and playback. Audio gaps are not completion.
  const responding = useRef(false);
  const toolContinuation = useRef(false);
  const replacingTurn = useRef(false);
  const toolQueue = useRef<Promise<void>>(Promise.resolve());
  const typedQuestion = useRef<string | null>(null);
  const recoveryAttempts = useRef(0);
  const recoverResponseRef = useRef<() => boolean>(() => false);
  const hasAnswer = useRef(false);
  const generationTailPending = useRef(false);
  const visualFailures = useRef(0);
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turn = useRef<{ id: string; revision: number } | null>(null);
  const groundedTurn = useRef<string | null>(null);
  const speechFrames = useRef(0);
  const speakingInput = useRef(false);
  const transcriptRef = useRef("");
  const outputRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const cancelledCalls = useRef(new Set<string>());
  const committedGuidance = useRef<PdfGuidance | null>(null);
  const committedCursor = useRef<PdfCursorCue | null>(null);
  const visualReadyAt = useRef(0);
  const pointerTurn = useRef<string | null>(null);
  const pointerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioStartingFor = useRef<{ turnId: string; pending: number } | null>(null);
  const pendingGuidanceCall = useRef<string | null>(null);
  // Speech-led steps: the matcher, steps heard but not yet played, and the audio already placed.
  const cues = useRef<SpokenCues | null>(null);
  const pendingCues = useRef<CueRelease[]>([]);
  const cueAudioFrom = useRef(0);
  const cueTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const events = useRef<PdfTutorEvent[]>([]);
  const statusRef = useRef<Status>("idle");
  const maxSessionMs = useRef(DEFAULT_MAX_SESSION_MS);
  const startRef = useRef<() => Promise<void>>(async () => {});
  const sendRef = useRef<(content: string) => boolean>(() => false);
  // Whether the session being opened (or reopened by a retry) should open the microphone.
  const wantMicrophone = useRef(true);
  const disarmRenewalRef = useRef<() => void>(() => {});
  const retry = useLiveRetry();
  const report = useCallback(
    (event: Omit<LiveSessionEvent, "surface">) => void aiTutorApi.reportEvent({ surface: "pdf", ...event }),
    [],
  );
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const trace = useCallback((name: string) => {
    const view = contextRef.current;
    events.current = [
      ...events.current.slice(-199),
      {
        name,
        at: performance.now(),
        page: view?.page,
        revision: view?.revision,
        turnId: turn.current?.id,
      },
    ];
  }, []);

  const hidePointer = useCallback(() => {
    if (pointerTimer.current) clearTimeout(pointerTimer.current);
    pointerTimer.current = null;
    pointerTurn.current = null;
    setPointerVisible(false);
  }, []);

  const settlePointer = useCallback(() => {
    if (pointerTimer.current) clearTimeout(pointerTimer.current);
    pointerTimer.current = null;
    const owner = pointerTurn.current;
    // Steps still waiting for their words keep the hand up.
    if (!owner || responding.current || playing.current || cues.current ||
      (audioStartingFor.current?.turnId === owner && audioStartingFor.current.pending > 0)) return;
    const closeWhenReady = () => {
      if (pointerTurn.current !== owner || responding.current || playing.current || cues.current ||
        (audioStartingFor.current?.turnId === owner && audioStartingFor.current.pending > 0)) return;
      const remaining = visualReadyAt.current - Date.now();
      if (remaining > 0) {
        pointerTimer.current = setTimeout(closeWhenReady, remaining);
        return;
      }
      pointerTimer.current = null;
      pointerTurn.current = null;
      setPointerVisible(false);
    };
    closeWhenReady();
  }, []);

  const stopCues = useCallback(() => {
    if (cueTimer.current) clearInterval(cueTimer.current);
    cueTimer.current = null;
    cues.current = null;
    pendingCues.current = [];
  }, []);

  // Shows the steps whose words are being heard now. Once the answer has finished playing,
  // steps whose words never came (the tutor said it differently) still appear, in order.
  const tickCues = useCallback(() => {
    const matcher = cues.current;
    if (!matcher) return;
    const audio = audioRef.current;
    const heard = voiceRef.current && audio ? audio.heardSeconds() : Infinity;
    let revealed = 0;
    while (pendingCues.current.length) {
      const next = pendingCues.current[0];
      if (next.at !== null && next.at - CUE_LEAD_SECONDS > heard) break;
      revealed = Math.max(revealed, next.revealed);
      pendingCues.current.shift();
    }
    const starting = audioStartingFor.current?.pending ?? 0;
    const finished = !responding.current && !playing.current && starting === 0;
    if (finished) revealed = matcher.total;
    if (revealed) setRevealedSteps((current) => Math.max(current ?? 0, revealed));
    if (finished || (matcher.done && !pendingCues.current.length)) {
      stopCues();
      // Give the page a moment to start drawing what was just released; it then reports
      // how long its drawing and linger take (onPresentationTiming).
      visualReadyAt.current = Math.max(visualReadyAt.current, Date.now() + 300);
      settlePointer();
    }
  }, [settlePointer, stopCues]);

  const startCues = useCallback((next: PdfGuidance) => {
    stopCues();
    const matcher = new SpokenCues(next.actions.map((action) => action.say));
    cues.current = matcher;
    cueAudioFrom.current = audioRef.current?.receivedSeconds() ?? 0;
    cueTimer.current = setInterval(tickCues, 50);
    return matcher.revealed;
  }, [stopCues, tickCues]);

  // The transcript of what the tutor says, placed on the audio it arrived with.
  const hearCues = useCallback((text: string) => {
    const matcher = cues.current;
    if (!matcher) return;
    const audio = voiceRef.current ? audioRef.current : null;
    const to = audio ? audio.receivedSeconds() : null;
    pendingCues.current.push(...matcher.hear(text, audio ? cueAudioFrom.current : null, to));
    if (to !== null) cueAudioFrom.current = to;
    tickCues();
  }, [tickCues]);

  const cancelTurn = useCallback((clearGuidance = true) => {
    stopCues();
    responding.current = false;
    typedQuestion.current = null;
    hasAnswer.current = false;
    setRecoveryNotice(null);
    toolContinuation.current = false;
    replacingTurn.current = false;
    if (responseTimer.current) clearTimeout(responseTimer.current);
    turn.current = null;
    groundedTurn.current = null;
    speakingInput.current = false;
    transcriptRef.current = "";
    outputRef.current = "";
    audioRef.current?.stop();
    audioStartingFor.current = null;
    hidePointer();
    visualReadyAt.current = 0;
    pendingGuidanceCall.current = null;
    if (clearGuidance) {
      committedGuidance.current = null;
      committedCursor.current = null;
      setRevealedSteps(null);
    }
    setCursorCue(committedCursor.current);
    setGuidance(committedGuidance.current);
    setOutputTranscript("");
    setInputTranscript("");
  }, [hidePointer, stopCues]);

  // Moves what was said in the current turn into the thread. Called again later in the same
  // turn only adds what is new: the question once, then each piece of the answer.
  const commitTurn = useCallback(() => {
    const active = turn.current;
    if (!active) return;
    const lines: TutorThreadMessage[] = [];
    const question = transcriptRef.current.replace(/\s+/g, " ").trim();
    if (question && committedQuestion.current !== active.id) {
      committedQuestion.current = active.id;
      lines.push({ id: `${active.id}:student`, author: "student", content: question });
      setInputTranscript("");
    }
    const answer = outputRef.current.replace(/\s+/g, " ").trim();
    if (answer) {
      outputRef.current = "";
      lines.push({ id: crypto.randomUUID(), author: "tutor", content: answer });
      setOutputTranscript("");
    }
    if (lines.length) setMessages((current) => [...current, ...lines]);
  }, []);

  const markProgress = useCallback(() => {
    if (responseTimer.current) clearTimeout(responseTimer.current);
    responseTimer.current = setTimeout(() => {
      if (!mounted.current || !responding.current) return;
      trace("response-timeout");
      report({ event: "response_timeout", phase: "live", attempt: recoveryAttempts.current,
        reason: events.current.slice(-8).map((event) => event.name).join(", ") });
      if (recoverResponseRef.current()) {
        markProgress();
        return;
      }
      commitTurn();
      cancelTurn(false);
      setError("Tutor belum menyelesaikan respons. Kirim ulang pertanyaan atau sambungkan ulang sesi.");
      setStatus(microphoneRef.current ? "listening" : "paused");
    }, 45_000);
  }, [cancelTurn, commitTurn, report, trace]);

  const disconnect = useCallback(async () => {
    generation.current++;
    generationTailPending.current = false;
    micGeneration.current++;
    connecting.current = false;
    openingMicrophone.current = false;
    lastImage.current = "";
    imageTurn.current = -Infinity;
    abortRef.current?.abort();
    abortRef.current = null;
    pendingText.current = null;
    retry.cancel();
    disarmRenewalRef.current();
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.close();
    const mic = microphoneRef.current;
    microphoneRef.current = null;
    commitTurn();
    cancelTurn();
    setListening(false);
    inputLevel.current = 0;
    voiceRef.current = false;
    setVoice(false);
    setStatus("idle");
    const audio = audioRef.current;
    audioRef.current = null;
    await Promise.all([mic?.stop(), audio?.close()]);
    trace("disconnected");
  }, [cancelTurn, commitTurn, retry.cancel, trace]);

  const beginTurn = useCallback(() => {
    commitTurn();
    setError(null);
    audioRef.current?.stop();
    audioRef.current?.beginTurn();
    audioStartingFor.current = null;
    responding.current = true;
    typedQuestion.current = null;
    recoveryAttempts.current = 0;
    visualFailures.current = 0;
    hasAnswer.current = false;
    setRecoveryNotice(null);
    toolContinuation.current = false;
    markProgress();
    // While the next page loads there is no view yet; get_pdf_context grounds the turn later.
    turn.current = { id: crypto.randomUUID(), revision: contextRef.current?.revision ?? -1 };
    turnCount.current++;
    groundedTurn.current = null;
    transcriptRef.current = "";
    outputRef.current = "";
    speakingInput.current = true;
    setInputTranscript("");
    setOutputTranscript("");
    visualReadyAt.current = 0;
    hidePointer();
    committedGuidance.current = null;
    committedCursor.current = null;
    setCursorCue(null);
    pendingGuidanceCall.current = null;
    setGuidance(null);
    setRevealedSteps(null);
    setStatus("thinking");
    trace("student-turn");
  }, [commitTurn, hidePointer, markProgress, trace]);

  const sendView = useCallback(
    (session: Session, view: PdfViewContext, forceImage = false, publishState = true) => {
      const { blocks: _blocks, ...state } = contextForModel(
        view,
        turn.current?.id ?? "waiting-for-student",
      );
      if (publishState && canPublishPdfContext(responding.current, playing.current)) session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text: `PDF_VIEW_STATE ${JSON.stringify(state)}` }],
          },
        ],
        turnComplete: false,
      });
      const imageKey = `${view.resourceId}:${view.fingerprint}:${view.page}`;
      if (forceImage || imageKey !== lastImage.current) {
        session.sendRealtimeInput({
          video: { data: view.image, mimeType: "image/jpeg" },
        });
        lastImage.current = imageKey;
        imageTurn.current = turnCount.current;
      }
      trace("context-sent");
    },
    [trace],
  );

  // A new session knows nothing of earlier ones (reconnects, renewals, sessions closed while
  // idle). The thread lives only in this page, so the page hands its latest turns over.
  const sendHistory = useCallback((session: Session) => {
    const lines: string[] = [];
    let length = 0;
    for (const message of messagesRef.current.slice(-12).reverse()) {
      const text = message.content.length > 600 ? `${message.content.slice(0, 600)}…` : message.content;
      const line = `${message.author === "student" ? "Siswa" : "NALAR"}: ${text}`;
      if (length + line.length > 4_000) break;
      lines.unshift(line);
      length += line.length + 1;
    }
    if (!lines.length) return;
    session.sendClientContent({
      turns: [{ role: "user", parts: [{ text: `CONVERSATION_HISTORY\n${lines.join("\n")}` }] }],
      turnComplete: false,
    });
    trace("history-sent");
  }, [trace]);

  const onMessage = useCallback(
    async (message: LiveServerMessage, sessionGeneration: number, requestedTurnId: string | null = turn.current?.id ?? null) => {
      if (!mounted.current || generation.current !== sessionGeneration) return;
      const session = sessionRef.current;
      if (!session) return;
      for (const id of message.toolCallCancellation?.ids ?? []) {
        cancelledCalls.current.add(id);
        if (pendingGuidanceCall.current === id) {
          cancelTurn();
          setStatus(microphoneRef.current ? "listening" : "paused");
        }
      }
      // Keep cancellation memory bounded over long sessions.
      if (cancelledCalls.current.size > 200)
        cancelledCalls.current = new Set(
          [...cancelledCalls.current].slice(-100),
        );
      const server = message.serverContent;
      if (server?.turnComplete && generationTailPending.current) {
        generationTailPending.current = false;
        // generationComplete already committed that answer. Its delayed playback
        // tail must not finish (or retry) a newer question on the same socket.
        if (!server.generationComplete && !server.outputTranscription?.text && !server.modelTurn?.parts?.length && !server.inputTranscription?.text)
          return;
      }
      if (server?.interrupted && replacingTurn.current) {
        // clientContent(turnComplete=true) interrupted the previous answer, not the
        // new typed question that already owns turn.current.
        replacingTurn.current = false;
        return;
      } else if (server?.interrupted) {
        commitTurn();
        cancelTurn();
        trace("interrupted");
        setStatus(microphoneRef.current ? "listening" : "paused");
      }
      if (server?.inputTranscription?.text) {
        if (!turn.current || !responding.current) beginTurn();
        requestedTurnId = turn.current?.id ?? null;
        markProgress();
        if (!typedQuestion.current) {
          transcriptRef.current += server.inputTranscription.text;
          setInputTranscript(transcriptRef.current);
        }
        if (!playing.current) setStatus("thinking");
      } else if (server?.interimInputTranscription?.text && voiceRef.current && microphoneRef.current) {
        if (!turn.current || !responding.current) beginTurn();
        requestedTurnId = turn.current?.id ?? null;
        markProgress();
        if (!typedQuestion.current) {
          // Interim text is a changing hypothesis, never part of the committed question.
          setInputTranscript(liveInputPreview(transcriptRef.current, server.interimInputTranscription.text));
        }
        setStatus("listening");
      }
      const calls = message.toolCall?.functionCalls ?? [];
      if (calls.length) trace("tool-requested");
      const functionResponses = [];
      if (calls.length && turn.current && turn.current.id === requestedTurnId) {
        responding.current = true;
        toolContinuation.current = true;
        markProgress();
        setStatus(playing.current ? "speaking" : "thinking");
      }
      for (const call of calls) {
        if (!call.id || cancelledCalls.current.has(call.id)) continue;
        let response: Record<string, unknown>;
        try {
          const view = contextRef.current;
          const active = turn.current;
          if (!active || active.id !== requestedTurnId) throw new Error("Tunggu pertanyaan baru siswa.");
          if (!view)
            throw new Error("Halaman PDF sedang dimuat. Coba lagi sebentar.");
          if (call.name === "get_pdf_context") {
            // The student may have turned the page mid-answer: ground on what is open now.
            active.revision = view.revision;
            // A changed page is resent by sendView itself. The same page is resent only every few
            // turns, in case conversation truncation dropped it: one image is up to ~200 KB of
            // uplink, seconds on a slow phone connection, before the tutor can answer.
            // Return context as the tool response, without appending a second user
            // message in the middle of a blocking function call.
            sendView(session, view, turnCount.current - imageTurn.current >= 3, false);
            groundedTurn.current = active.id;
            response = contextForModel(view, active.id);
            trace("context-read");
          } else if (call.name === "present_pdf_guidance" || call.name === "move_pdf_cursor") {
            if (visualFailures.current >= 2 || recoveryAttempts.current > 0)
              throw new Error("Lanjutkan penjelasan tanpa tool visual pada giliran ini.");
            if (groundedTurn.current !== active.id)
              throw new Error(
                "Panggil get_pdf_context pada giliran ini dahulu.",
              );
            if (active.revision !== view.revision)
              throw new Error(
                "Tampilan PDF berubah. Panggil get_pdf_context lagi sebelum menandai halaman.",
              );
            // Model generation can run ahead of real playback. Keep the next visual
            // step behind the audio already queued for the previous reference.
            pendingGuidanceCall.current = call.id;
            const callId = call.id;
            const current = () => generation.current === sessionGeneration &&
              turn.current?.id === active.id && !cancelledCalls.current.has(callId);
            const quiet = await waitUntil(
              () => Date.now() >= visualReadyAt.current && (!voiceRef.current || !playing.current),
              Math.max(Date.now(), visualReadyAt.current) + 20_000,
              { pollMs: 40, cancelled: () => !current() || contextRef.current?.revision !== view.revision },
            );
            if (!quiet || !current()) throw new Error("Langkah dibatalkan atau audio sebelumnya belum selesai.");
            if (contextRef.current?.revision !== view.revision)
              throw new Error("Tampilan berubah saat menunggu audio. Panggil get_pdf_context lagi.");
            const cursorOnly = call.name === "move_pdf_cursor";
            const nextCursor = cursorOnly ? parsePdfCursor(call.args, view, active.id) : null;
            const next = cursorOnly ? null : parsePdfGuidance(call.args, view, active.id);
            // Cursor-only steps preserve the drawing and its playback progress.
            pendingGuidanceCall.current = call.id;
            pointerTurn.current = active.id;
            setPointerVisible(true);
            setCursorCue(nextCursor);
            if (next) {
              // Planned steps wait for their words; older guidance shows all at once.
              if (pdfGuidanceFollowsSpeech(next)) setRevealedSteps(startCues(next));
              else {
                stopCues();
                setRevealedSteps(null);
              }
              setGuidance(next);
            }
            await new Promise<void>((resolve) => {
              const timer = setTimeout(resolve, 80);
              requestAnimationFrame(() => {
                clearTimeout(timer);
                resolve();
              });
            });
            if (
              generation.current !== sessionGeneration ||
              turn.current?.id !== active.id ||
              contextRef.current?.revision !== view.revision ||
              cancelledCalls.current.has(call.id) ||
              pendingGuidanceCall.current !== call.id
            )
              throw new Error("Tindakan dibatalkan karena konteks berubah.");
            if (next) committedGuidance.current = next;
            committedCursor.current = nextCursor;
            pendingGuidanceCall.current = null;
            response = {
              ok: true,
              page: view.page,
              revision: view.revision,
              turnId: active.id,
            };
            trace(cursorOnly ? "cursor-moved" : "guidance-presented");
          } else {
            throw new Error("Tool tidak dikenali.");
          }
        } catch (caught) {
          // A drawing that lost its view (the page turned meanwhile) is taken back.
          if (pendingGuidanceCall.current === call.id) {
            pendingGuidanceCall.current = null;
            stopCues();
            setRevealedSteps(null);
            setGuidance(committedGuidance.current);
            setCursorCue(committedCursor.current);
          }
          if (call.name === "present_pdf_guidance" || call.name === "move_pdf_cursor") visualFailures.current++;
          response = {
            ok: false,
            continueWithExplanation: true,
            responseInstruction: "Tindakan visual gagal. Tetap jawab pertanyaan siswa dengan penjelasan dan contoh. Jangan ulangi tool visual yang gagal; gunakan konteks yang sudah tersedia.",
            error:
              caught instanceof Error
                ? caught.message
                : "Tindakan tidak valid.",
          };
          trace("tool-rejected");
        }
        if (
          generation.current === sessionGeneration &&
          !cancelledCalls.current.has(call.id)
        ) {
          functionResponses.push({ id: call.id, name: call.name, response });
        }
      }
      if (generation.current !== sessionGeneration) return;
      const validResponses = functionResponses.filter((response) => !cancelledCalls.current.has(response.id));
      if (validResponses.length) {
        if (turn.current && responding.current) toolContinuation.current = true;
        session.sendToolResponse({ functionResponses: validResponses });
        trace("tool-response-sent");
      }
      const active = turn.current;
      // Any answer of the current turn is shown, grounded or not: a spoken "halo" or "makasih"
      // is answered without get_pdf_context, and dropping it left the student with silence and
      // an error. Grounding gates the visual tools only (see present_pdf_guidance). Not tied to
      // the view revision either: turning the page must not mute an answer in progress.
      const outputText = pdfOutputText(server);
      if (active) {
        const hasOutput = !!outputText ||
          !!server?.modelTurn?.parts?.some((part) => !part.thought && (part.text || part.inlineData));
        if (hasOutput) {
          replacingTurn.current = false;
          hasAnswer.current ||= !!outputText || (voiceRef.current &&
            !!server?.modelTurn?.parts?.some((part) => part.inlineData?.mimeType?.startsWith("audio/")));
          setRecoveryNotice(null);
          trace("model-output");
          speakingInput.current = false;
          toolContinuation.current = false;
          markProgress();
        }
        if (outputText) {
          outputRef.current += outputText;
          setOutputTranscript(outputRef.current);
          audioRef.current?.noteTranscript(outputText);
        }
        for (const part of server?.modelTurn?.parts ?? []) {
          if (
            voiceRef.current &&
            part.inlineData?.data &&
            part.inlineData.mimeType?.startsWith("audio/")
          ) {
            trace("audio-received");
            const audio = audioRef.current;
            if (audio) {
              const starting = audioStartingFor.current?.turnId === active.id
                ? audioStartingFor.current
                : { turnId: active.id, pending: 0 };
              audioStartingFor.current = starting;
              starting.pending++;
              void audio.play(part.inlineData.data, part.inlineData.mimeType).catch(() => {
                setError("Audio belum dapat diputar. Coba jeda dan lanjutkan mikrofon.");
              }).finally(() => {
                starting.pending--;
                if (audioStartingFor.current === starting) settlePointer();
              });
            }
          }
        }
        if (outputText) hearCues(outputText);
      }
      const reason = server?.turnCompleteReason;
      if (server?.turnComplete && reason && reason !== "TURN_COMPLETE_REASON_UNSPECIFIED" && reason !== "NEED_MORE_INPUT") {
        if (reason === "MALFORMED_FUNCTION_CALL" && recoverResponseRef.current()) {
          markProgress();
          return;
        }
        commitTurn();
        cancelTurn(false);
        setError("Tutor belum berhasil menyelesaikan tindakan. Coba minta satu langkah singkat atau kirim ulang pertanyaan.");
        setStatus(microphoneRef.current ? "listening" : "paused");
        trace("response-rejected");
        return;
      }
      // A function-call boundary can arrive in its own frame while its async tool is
      // still rendering. Only the answer boundary completes the student's response.
      if (!message.toolCall && pdfResponseEnded(server, {
        pendingTool: !!pendingGuidanceCall.current,
        toolContinuation: toolContinuation.current,
        hasOutput: hasAnswer.current,
      })) {
        trace("response-ended");
        if (responding.current && !hasAnswer.current && recoverResponseRef.current()) {
          markProgress();
          return;
        }
        if (responding.current && !hasAnswer.current) {
          const retried = recoveryAttempts.current > 0;
          report({ event: "empty_response", phase: "live", attempt: recoveryAttempts.current,
            reason: events.current.slice(-8).map((event) => event.name).join(", ") });
          commitTurn();
          cancelTurn(false);
          setError(retried
            ? "Tutor belum mengirim jawaban setelah dicoba ulang. Sambungkan ulang sesi untuk melanjutkan."
            : "Tutor belum menjawab. Ulangi pertanyaanmu, atau sambungkan ulang sesi bila tetap diam.");
          setStatus(microphoneRef.current ? "listening" : "paused");
          return;
        }
        generationTailPending.current = !!server?.generationComplete && !server.turnComplete;
        responding.current = false;
        if (responseTimer.current) clearTimeout(responseTimer.current);
        commitTurn();
        settlePointer();
        if (!playing.current) setStatus(microphoneRef.current ? "listening" : "paused");
      }
    },
    [beginTurn, cancelTurn, commitTurn, hearCues, markProgress, sendView, settlePointer, startCues, stopCues, trace],
  );

  const startMicrophone = useCallback(async () => {
    if (
      microphoneRef.current ||
      openingMicrophone.current ||
      !sessionRef.current
    )
      return;
    openingMicrophone.current = true;
    const currentGeneration = generation.current;
    const currentMicGeneration = ++micGeneration.current;
    const isCurrent = () =>
      mounted.current &&
      generation.current === currentGeneration &&
      micGeneration.current === currentMicGeneration &&
      !!sessionRef.current;
    let microphone: TutorMicrophone | null;
    try {
      microphone = await openTutorMicrophone((data, level) => {
        const session = sessionRef.current;
        if (!session) return;
        inputLevel.current = level;
        // Two loud frames avoid interrupting for a single click or a small breath.
        speechFrames.current = level > 0.16 ? speechFrames.current + 1 : 0;
        if (
          speechFrames.current === 2 &&
          (!turn.current || !speakingInput.current)
        ) {
          beginTurn();
          setStatus("listening");
          if (contextRef.current) sendView(session, contextRef.current);
        }
        session.sendRealtimeInput({
          audio: { data, mimeType: TUTOR_INPUT_MIME_TYPE },
        });
      }, isCurrent);
    } finally {
      if (currentMicGeneration === micGeneration.current)
        openingMicrophone.current = false;
    }
    if (!isCurrent()) {
      await microphone?.stop();
      return;
    }
    microphoneRef.current = microphone;
    setListening(!!microphone);
    if (microphone) {
      voiceRef.current = true;
      setVoice(true);
    }
    setStatus(playing.current ? "speaking" : responding.current ? "thinking" : "listening");
  }, [beginTurn, sendView]);

  // The timer of a scheduled retry fired. The page may have been swapped out meanwhile.
  const runRetry = useCallback(() => {
    if (!mounted.current) return;
    if (!contextRef.current) {
      setError("Halaman PDF belum siap. Coba sambungkan lagi.");
      setStatus("error");
      return;
    }
    void startRef.current();
  }, []);

  // Callbacks for one Live session. `holder.session` is that session once it exists: after a
  // renewal swapped it out, whatever the old socket still says is ignored.
  const makeCallbacks = useCallback(
    (gen: number, holder: { session: Session | null }) => {
      const stale = () =>
        !mounted.current ||
        generation.current !== gen ||
        (holder.session !== null && sessionRef.current !== holder.session);
      const failHard = (message: string) => {
        if (stale()) return;
        void disconnect().then(() => {
          if (mounted.current) {
            setError(message);
            setStatus("error");
          }
        });
      };
      // The session was accepted and later ended without us asking.
      const lost = (info: LiveCloseInfo) => {
        if (stale()) return;
        const failure = classifyLiveClose(info, maxSessionMs.current);
        report({ event: "closed", phase: "live", kind: failure.kind, code: info.code, reason: info.reason, ageMs: info.ageMs });
        void disconnect().then(() => {
          if (!mounted.current) return;
          const scheduled = retry.schedule(
            failure,
            runRetry,
            (attempt) => report({ event: "retry_scheduled", kind: failure.kind, attempt }),
          );
          if (scheduled) {
            setStatus("connecting");
            return;
          }
          setError(`${failure.message} Sambungkan ulang untuk melanjutkan.`);
          setStatus("error");
        });
      };
      return {
        onmessage: (message: LiveServerMessage) => {
          if (stale()) return;
          const requestedTurnId = turn.current?.id ?? null;
          const run = () => {
            if (stale()) return Promise.resolve();
            return onMessage(message, gen, requestedTurnId).catch(() =>
              failHard("Koneksi tutor terputus. Silakan sambungkan ulang."),
            );
          };
          if (message.toolCall?.functionCalls?.length) {
            if (turn.current && message.toolCall.functionCalls.some((call) => call.id && !cancelledCalls.current.has(call.id)))
              toolContinuation.current = true;
            // Serialize mutations only. Cancellation and interruption must stay immediate.
            toolQueue.current = toolQueue.current.then(run);
          } else void run();
        },
        onerror: lost,
        onclose: lost,
      };
    },
    [disconnect, onMessage, report, retry.schedule, runRetry],
  );

  // Hands the conversation to a fresh session shortly before Google's 10-minute cut-off.
  const renew = useCallback(
    async (deadlineAt: number) => {
      const old = sessionRef.current;
      const gen = generation.current;
      const view = contextRef.current;
      if (!old || !view) return false;
      const holder: { session: Session | null } = { session: null };
      const began = Date.now();
      const replaced = () => !mounted.current || generation.current !== gen || sessionRef.current !== old;
      let next: Session | null = null;
      try {
        const abort = new AbortController();
        const timeout = setTimeout(() => abort.abort(), 20_000);
        let data;
        try {
          data = await aiTutorApi.createPdfSession(resourceId, abort.signal);
        } finally {
          clearTimeout(timeout);
        }
        if (data.resourceId !== resourceId) return false;
        if (data.maxSessionSeconds) maxSessionMs.current = data.maxSessionSeconds * 1000;
        next = await connectTutorLive(data.token, data.model, makeCallbacks(gen, holder));
        holder.session = next;
        // Swap in a quiet moment so nothing the student is saying is split between two sessions.
        await waitUntil(
          () => !playing.current && (statusRef.current === "listening" || statusRef.current === "paused"),
          deadlineAt,
          { cancelled: replaced },
        );
        if (replaced()) {
          next.close();
          return false;
        }
        sessionRef.current = next;
        old.close();
        // The new session has seen neither the page nor its image.
        lastImage.current = "";
        imageTurn.current = -Infinity;
        sendView(next, contextRef.current ?? view, true);
        sendHistory(next);
        retry.markReady();
        report({ event: "renewed", phase: "live", ageMs: Date.now() - began });
        trace("session-renewed");
        return true;
      } catch (error) {
        next?.close();
        const failure = classifyStartError(error, maxSessionMs.current);
        report({ event: "renew_failed", phase: "connect", kind: failure?.kind });
        return false;
      }
    },
    [makeCallbacks, report, resourceId, retry.markReady, sendHistory, sendView, trace],
  );
  const renewal = useSessionRenewal(renew, () => maxSessionMs.current);
  disarmRenewalRef.current = renewal.disarm;

  const start = useCallback(async () => {
    if (connecting.current || sessionRef.current || !contextRef.current) return;
    connecting.current = true;
    const currentGeneration = ++generation.current;
    setError(null);
    setStatus("connecting");
    try {
      audioRef.current = new TutorAudioOutput((isPlaying) => {
        playing.current = isPlaying;
        // Closing the output (disconnect) reports "stopped" too: that must not undo "idle".
        if (!mounted.current || currentGeneration !== generation.current) return;
        if (!isPlaying) settlePointer();
        setStatus(
          isPlaying
            ? "speaking"
            : responding.current
              ? "thinking"
              : microphoneRef.current
                ? "listening"
                : "paused",
        );
        if (isPlaying) trace("audio-playing");
      }, () => {
        if (!mounted.current || currentGeneration !== generation.current) return;
        setError("Suara tutor terhenti karena audio tidak sesuai dengan teks. Jawaban teks tetap tersedia.");
        trace("audio-runaway-stopped");
      });
      await audioRef.current.prepare();
      const abort = new AbortController();
      abortRef.current = abort;
      const timeout = setTimeout(() => abort.abort(), 20_000);
      let data;
      try {
        data = await aiTutorApi.createPdfSession(resourceId, abort.signal);
      } finally {
        clearTimeout(timeout);
      }
      if (!mounted.current || currentGeneration !== generation.current) return;
      if (data.resourceId !== resourceId)
        throw new Error("Sesi tutor tidak cocok dengan PDF.");
      if (data.maxSessionSeconds) maxSessionMs.current = data.maxSessionSeconds * 1000;
      const holder: { session: Session | null } = { session: null };
      const session = await connectTutorLive(data.token, data.model, makeCallbacks(currentGeneration, holder));
      holder.session = session;
      if (!mounted.current || currentGeneration !== generation.current) {
        session.close();
        return;
      }
      sessionRef.current = session;
      retry.markReady();
      renewal.arm();
      if (wantMicrophone.current && contextRef.current) sendView(session, contextRef.current);
      sendHistory(session);
      if (wantMicrophone.current) await startMicrophone();
      else setStatus("paused");
      trace("connected");
      const text = pendingText.current;
      pendingText.current = null;
      if (text) sendRef.current(text);
    } catch (caught) {
      if (currentGeneration !== generation.current || !mounted.current) return;
      const failure = classifyStartError(caught, maxSessionMs.current);
      if (failure) {
        const detail = caught as { info?: LiveCloseInfo };
        report({
          event: "connect_failed",
          phase: "connect",
          kind: failure.kind,
          code: detail.info?.code,
          reason: detail.info?.reason ?? failure.reason,
          ageMs: detail.info?.ageMs,
          attempt: retry.attempts.current,
        });
      }
      const message =
        failure?.message ??
        (caught instanceof HttpError
          ? caught.message
          : caught instanceof DOMException && caught.name === "NotAllowedError"
            ? "Izin mikrofon ditolak. Izinkan mikrofon di browser, lalu sambungkan kembali."
            : caught instanceof Error && caught.message.includes("HTTPS")
              ? caught.message
              : "Tutor belum dapat disambungkan. Periksa jaringan dan izin mikrofon, lalu coba lagi.");
      const unsent = pendingText.current;
      await disconnect();
      if (!mounted.current) return;
      pendingText.current = unsent;
      const scheduled =
        failure !== null &&
        retry.schedule(
          failure,
          runRetry,
          (attempt) => report({ event: "retry_scheduled", kind: failure.kind, attempt }),
        );
      if (scheduled) {
        setStatus("connecting");
        return;
      }
      pendingText.current = null;
      const shown = failure && failure.autoRetry ? `${message} Silakan coba lagi sebentar lagi.` : message;
      setError(unsent ? `${shown} Pesanmu belum terkirim.` : shown);
      setStatus("error");
    } finally {
      if (currentGeneration === generation.current) connecting.current = false;
    }
  }, [
    disconnect,
    makeCallbacks,
    renewal.arm,
    report,
    resourceId,
    retry.attempts,
    retry.markReady,
    retry.schedule,
    runRetry,
    sendHistory,
    sendView,
    settlePointer,
    startMicrophone,
    trace,
  ]);
  startRef.current = start;

  // The student pressed a button: a fresh retry allowance.
  const begin = useCallback(
    async (microphone = true) => {
      wantMicrophone.current = microphone;
      retry.reset();
      await start();
    },
    [retry.reset, start],
  );

  // A typed question. Starts a session (without the microphone) when there is none yet.
  const send = useCallback(
    (raw: string) => {
      const content = raw.trim();
      const session = sessionRef.current;
      const view = contextRef.current;
      if (!content || !view) return false;
      if (!session) {
        pendingText.current = content;
        if (!connecting.current && statusRef.current !== "connecting") void begin(false);
        return true;
      }
      setError(null);
      replacingTurn.current = responding.current || generationTailPending.current;
      beginTurn();
      // Not speech: a sound on the microphone must start a new turn, not extend this one.
      speakingInput.current = false;
      transcriptRef.current = content;
      commitTurn();
      typedQuestion.current = content;
      const active = turn.current!;
      try {
        const imageKey = `${view.resourceId}:${view.fingerprint}:${view.page}`;
        const includeImage = imageKey !== lastImage.current || turnCount.current - imageTurn.current >= 3;
        session.sendClientContent(pdfQuestionContent(view, active.id, content, includeImage));
        groundedTurn.current = active.id;
        if (includeImage) {
          lastImage.current = imageKey;
          imageTurn.current = turnCount.current;
        }
        trace("text-sent");
        return true;
      } catch {
        cancelTurn(false);
        setError("Pesan belum dapat dikirim. Sambungkan ulang tutor lalu coba lagi.");
        setStatus("error");
        return false;
      }
    },
    [begin, beginTurn, cancelTurn, commitTurn, trace],
  );
  sendRef.current = send;
  recoverResponseRef.current = () => {
    const session = sessionRef.current;
    const view = contextRef.current;
    const active = turn.current;
    const question = typedQuestion.current;
    if (!session || !view || !active || !question || hasAnswer.current || recoveryAttempts.current >= 1) return false;
    recoveryAttempts.current++;
    try {
      active.revision = view.revision;
      groundedTurn.current = active.id;
      toolContinuation.current = false;
      // Invalidate an old rendering task before retriggering the same request.
      pendingGuidanceCall.current = null;
      session.sendClientContent(pdfQuestionContent(view, active.id, question, true, true));
      lastImage.current = `${view.resourceId}:${view.fingerprint}:${view.page}`;
      imageTurn.current = turnCount.current;
      replacingTurn.current = true;
      setRecoveryNotice("Tutor sedang mencoba menyelesaikan penjelasanmu…");
      setStatus("thinking");
      trace("response-recovery");
      report({ event: "response_recovery", phase: "live", attempt: recoveryAttempts.current });
      return true;
    } catch {
      return false;
    }
  };

  // Speak instead of (or as well as) typing. Connects first when needed.
  const startVoice = useCallback(async () => {
    if (!sessionRef.current) return begin(true);
    setError(null);
    try {
      await audioRef.current?.prepare();
      await startMicrophone();
    } catch {
      setError("Mikrofon belum dapat digunakan. Periksa izin mikrofon di browser.");
    }
  }, [begin, startMicrophone]);

  // Loudness of whoever is speaking now, read by the voice orb every frame.
  const readLevel = useCallback(() => {
    const tutor = audioRef.current?.level() ?? 0;
    if (tutor > 0) return tutor;
    return microphoneRef.current ? Math.min(1, inputLevel.current * 1.8) : 0;
  }, []);

  const toggleMicrophone = useCallback(async () => {
    setError(null);
    if (microphoneRef.current) {
      micGeneration.current++;
      const mic = microphoneRef.current;
      microphoneRef.current = null;
      sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
      setListening(false);
      inputLevel.current = 0;
      if (!typedQuestion.current) setInputTranscript(transcriptRef.current);
      setStatus(playing.current ? "speaking" : responding.current ? "thinking" : "paused");
      await mic.stop();
    } else {
      try {
        await audioRef.current?.prepare();
        await startMicrophone();
      } catch {
        setError(
          "Mikrofon belum dapat digunakan. Periksa izin mikrofon di browser.",
        );
      }
    }
  }, [startMicrophone]);

  // Back to text only: the microphone closes and replies are no longer spoken. The session
  // stays, and an answer in progress keeps arriving as text.
  const endVoice = useCallback(async () => {
    voiceRef.current = false;
    setVoice(false);
    audioRef.current?.stop();
    if (microphoneRef.current) await toggleMicrophone();
  }, [toggleMicrophone]);

  const stopExplanation = useCallback(() => {
    commitTurn();
    cancelTurn();
    setStatus(microphoneRef.current ? "listening" : "paused");
    trace("student-stopped");
  }, [cancelTurn, commitTurn, trace]);

  useEffect(() => {
    const previous = contextRef.current;
    contextRef.current = context;
    if (
      previous?.revision === context?.revision &&
      previous?.resourceId === context?.resourceId
    )
      return;
    // Turning, zooming or scrolling the PDF is not an interruption: the tutor keeps
    // talking and only the student's voice or the stop button cuts it off. Ink stays
    // anchored to its own page (the reader shows it only there); drawing on the new
    // view requires get_pdf_context again (see present_pdf_guidance).
    trace("context-changed");
    hidePointer();
    visualReadyAt.current = 0;
    // Invalidate locally immediately; coalesce rapid scroll/resize updates on the wire.
    const timer = setTimeout(() => {
      if (
        sessionRef.current &&
        context &&
        contextRef.current?.revision === context.revision &&
        canPublishPdfContext(responding.current, playing.current)
      ) {
        try {
          sendView(sessionRef.current, context);
        } catch {
          setError("Konteks halaman belum terkirim. Sambungkan ulang tutor.");
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [context, hidePointer, sendView, trace]);

  const onPresentationTiming = useCallback((turnId: string, remainingMs: number) => {
    if (turn.current?.id !== turnId) return;
    visualReadyAt.current = Date.now() + Math.max(0, remainingMs);
    settlePointer();
    // A deliberate reading pause is progress, not a stalled provider response.
    if (responding.current) markProgress();
  }, [markProgress, settlePointer]);

  // Typed questions only and nothing happening: give the Live session back. The thread stays
  // and is handed to the next session, opened by the next question.
  useIdleClose(status === "paused" && !voice, () => {
    report({ event: "idle_closed", phase: "live" });
    void disconnect();
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void disconnect();
    };
  }, [disconnect, resourceId]);

  return {
    status,
    error,
    notice: retry.notice ?? recoveryNotice,
    guidance,
    revealedSteps,
    cursorCue,
    pointerVisible,
    onPresentationTiming,
    inputTranscript,
    outputTranscript,
    listening,
    voice,
    messages,
    connected: !!sessionRef.current,
    start: begin,
    retry: () => begin(wantMicrophone.current),
    send,
    startVoice,
    endVoice,
    readLevel,
    disconnect,
    toggleMicrophone,
    stopExplanation,
    events,
  };
}

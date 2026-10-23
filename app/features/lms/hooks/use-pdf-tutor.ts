import { useCallback, useEffect, useRef, useState } from "react";
import { connectTutorLive, type LiveServerMessage, type Session } from "../lib/live-tutor-client";
import { HttpError } from "~/lib/http";
import { aiTutorApi } from "../api/ai-tutor";
import {
  contextForModel,
  parsePdfGuidance,
  type PdfGuidance,
  type PdfViewContext,
} from "../lib/pdf-tutor";
import {
  openTutorMicrophone,
  tutorAudioFormat,
  TutorAudioOutput,
  type TutorAudioFormat,
  type TutorMicrophone,
} from "../lib/tutor-audio";

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
  const [error, setError] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<PdfGuidance | null>(null);
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const contextRef = useRef(context);
  const sessionRef = useRef<Session | null>(null);
  const microphoneRef = useRef<TutorMicrophone | null>(null);
  const audioRef = useRef<TutorAudioOutput | null>(null);
  const generation = useRef(0);
  const micGeneration = useRef(0);
  const connecting = useRef(false);
  const openingMicrophone = useRef(false);
  const lastImage = useRef("");
  const audioFormat = useRef<TutorAudioFormat>("pcm");
  // Student turns, and the turn the page image was last sent on (see sendView).
  const turnCount = useRef(0);
  const imageTurn = useRef(-Infinity);
  const mounted = useRef(false);
  const playing = useRef(false);
  const turn = useRef<{ id: string; revision: number } | null>(null);
  const groundedTurn = useRef<string | null>(null);
  const speechFrames = useRef(0);
  const speakingInput = useRef(false);
  const transcriptRef = useRef("");
  const outputRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const cancelledCalls = useRef(new Set<string>());
  const committedGuidance = useRef<PdfGuidance | null>(null);
  const pendingGuidanceCall = useRef<string | null>(null);
  const events = useRef<PdfTutorEvent[]>([]);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const cancelTurn = useCallback((clearGuidance = true) => {
    sessionRef.current?.interrupt();
    turn.current = null;
    groundedTurn.current = null;
    speakingInput.current = false;
    transcriptRef.current = "";
    outputRef.current = "";
    audioRef.current?.stop();
    pendingGuidanceCall.current = null;
    if (clearGuidance) committedGuidance.current = null;
    setGuidance(committedGuidance.current);
    setOutputTranscript("");
    setInputTranscript("");
  }, []);

  const disconnect = useCallback(async () => {
    generation.current++;
    micGeneration.current++;
    connecting.current = false;
    openingMicrophone.current = false;
    lastImage.current = "";
    imageTurn.current = -Infinity;
    abortRef.current?.abort();
    abortRef.current = null;
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = null;
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.close();
    const mic = microphoneRef.current;
    microphoneRef.current = null;
    cancelTurn();
    setListening(false);
    setLevel(0);
    setStatus("idle");
    const audio = audioRef.current;
    audioRef.current = null;
    await Promise.all([mic?.stop(), audio?.close()]);
    trace("disconnected");
  }, [cancelTurn, trace]);

  const beginTurn = useCallback(() => {
    audioRef.current?.stop();
    // While the next page loads there is no view yet; get_pdf_context grounds the turn later.
    turn.current = { id: crypto.randomUUID(), revision: contextRef.current?.revision ?? -1 };
    turnCount.current++;
    groundedTurn.current = null;
    transcriptRef.current = "";
    outputRef.current = "";
    speakingInput.current = true;
    setInputTranscript("");
    setOutputTranscript("");
    committedGuidance.current = null;
    pendingGuidanceCall.current = null;
    setGuidance(null);
    setStatus("thinking");
    trace("student-turn");
  }, [trace]);

  const sendView = useCallback(
    (session: Session, view: PdfViewContext, forceImage = false) => {
      const { blocks: _blocks, ...state } = contextForModel(
        view,
        turn.current?.id ?? "waiting-for-student",
      );
      session.sendClientContent({
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

  const onMessage = useCallback(
    async (message: LiveServerMessage, sessionGeneration: number) => {
      if (!mounted.current || generation.current !== sessionGeneration) return;
      const session = sessionRef.current;
      if (!session) return;
      for (const id of message.toolCallCancellation?.ids ?? []) {
        cancelledCalls.current.add(id);
        if (pendingGuidanceCall.current === id) cancelTurn();
      }
      // Keep cancellation memory bounded over long sessions.
      if (cancelledCalls.current.size > 200)
        cancelledCalls.current = new Set(
          [...cancelledCalls.current].slice(-100),
        );
      const server = message.serverContent;
      if (server?.interrupted) {
        cancelTurn();
        trace("interrupted");
        setStatus(microphoneRef.current ? "listening" : "paused");
      }
      if (server?.inputStarted && (!turn.current || !speakingInput.current)) beginTurn();
      if (server?.inputTranscription?.text) {
        if (!turn.current) beginTurn();
        transcriptRef.current += server.inputTranscription.text;
        setInputTranscript(transcriptRef.current);
      }
      for (const call of message.toolCall?.functionCalls ?? []) {
        if (!call.id || cancelledCalls.current.has(call.id)) continue;
        let response: Record<string, unknown>;
        try {
          const view = contextRef.current;
          const active = turn.current;
          if (!active) throw new Error("Tunggu pertanyaan baru siswa.");
          if (!view)
            throw new Error("Halaman PDF sedang dimuat. Coba lagi sebentar.");
          if (call.name === "get_pdf_context") {
            // The student may have turned the page mid-answer: ground on what is open now.
            active.revision = view.revision;
            // A changed page is resent by sendView itself. The same page is resent only every few
            // turns, in case conversation truncation dropped it: one image is up to ~200 KB of
            // uplink, seconds on a slow phone connection, before the tutor can answer.
            sendView(session, view, turnCount.current - imageTurn.current >= 3);
            groundedTurn.current = active.id;
            response = contextForModel(view, active.id);
            trace("context-read");
          } else if (call.name === "present_pdf_guidance") {
            if (groundedTurn.current !== active.id)
              throw new Error(
                "Panggil get_pdf_context pada giliran ini dahulu.",
              );
            if (active.revision !== view.revision)
              throw new Error(
                "Tampilan PDF berubah. Panggil get_pdf_context lagi sebelum menandai halaman.",
              );
            const next = parsePdfGuidance(call.args, view, active.id);
            // Start the ink timeline before acknowledging; speech may accompany the strokes.
            pendingGuidanceCall.current = call.id;
            setGuidance(next);
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
            committedGuidance.current = next;
            pendingGuidanceCall.current = null;
            response = {
              ok: true,
              page: view.page,
              revision: view.revision,
              turnId: active.id,
            };
            trace("guidance-presented");
          } else {
            throw new Error("Tool tidak dikenali.");
          }
        } catch (caught) {
          // A drawing that lost its view (the page turned meanwhile) is taken back.
          if (pendingGuidanceCall.current === call.id) {
            pendingGuidanceCall.current = null;
            setGuidance(committedGuidance.current);
          }
          response = {
            ok: false,
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
          session.sendToolResponse({
            functionResponses: [{ id: call.id, name: call.name, response }],
          });
        }
      }
      if (generation.current !== sessionGeneration) return;
      const active = turn.current;
      // Not tied to the view revision: turning the page must not mute an answer in progress.
      const canRespond = active && groundedTurn.current === active.id;
      if (canRespond) {
        if (
          server?.outputTranscription?.text ||
          server?.modelTurn?.parts?.length
        )
          speakingInput.current = false;
        if (server?.outputTranscription?.text) {
          outputRef.current += server.outputTranscription.text;
          setOutputTranscript(outputRef.current);
        }
        for (const part of server?.modelTurn?.parts ?? []) {
          if (
            part.inlineData?.data &&
            part.inlineData.mimeType?.startsWith("audio/")
          ) {
            trace("audio-received");
            void audioRef.current?.play(part.inlineData.data, part.inlineData.mimeType).catch(() => {
              setError(
                "Audio belum dapat diputar. Coba jeda dan lanjutkan mikrofon.",
              );
            });
          }
        }
      }
      if (server?.turnComplete && !message.toolCall && !playing.current) {
        setStatus(microphoneRef.current ? "listening" : "paused");
      }
    },
    [beginTurn, cancelTurn, sendView, trace],
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
      microphone = await openTutorMicrophone((data, inputLevel) => {
        const session = sessionRef.current;
        if (!session) return;
        setLevel(inputLevel);
        // Two loud frames avoid interrupting for a single click or a small breath.
        speechFrames.current = inputLevel > 0.16 ? speechFrames.current + 1 : 0;
        if (
          speechFrames.current === 2 &&
          (!turn.current || !speakingInput.current)
        ) {
          beginTurn();
          if (contextRef.current) sendView(session, contextRef.current);
        }
        session.sendRealtimeInput({
          audio: { data, mimeType: audioFormat.current === "pcmu" ? "audio/pcmu" : "audio/pcm;rate=24000" },
        });
      }, isCurrent, audioFormat.current);
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
    setStatus("listening");
  }, [beginTurn, sendView]);

  const start = useCallback(async () => {
    if (connecting.current || sessionRef.current || !contextRef.current) return;
    connecting.current = true;
    const currentGeneration = ++generation.current;
    setError(null);
    setStatus("connecting");
    try {
      audioRef.current = new TutorAudioOutput((isPlaying) => {
        playing.current = isPlaying;
        if (!mounted.current) return;
        setStatus(
          isPlaying
            ? "speaking"
            : microphoneRef.current
              ? "listening"
              : "paused",
        );
        if (isPlaying) trace("audio-playing");
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
      const fail = (message: string) => {
        if (!mounted.current || currentGeneration !== generation.current)
          return;
        void disconnect().then(() => {
          if (mounted.current) {
            setError(message);
            setStatus("error");
          }
        });
      };
      const connectionTimeout = setTimeout(
        () => fail("Koneksi tutor terlalu lama. Silakan coba lagi."),
        20_000,
      );
      let session: Session;
      try {
        audioFormat.current = tutorAudioFormat(data.audioFormat);
        session = await connectTutorLive(data.token, data.model, {
            onmessage: (message) => {
              void onMessage(message, currentGeneration).catch(() =>
                fail("Koneksi tutor terputus. Silakan sambungkan ulang."),
              );
            },
            onerror: (message) =>
              fail(message ?? "Koneksi tutor mengalami gangguan. Silakan coba lagi."),
            onclose: () =>
              fail(
                "Sesi tutor telah berakhir. Sambungkan ulang untuk melanjutkan.",
              ),
        }, audioFormat.current);
      } finally {
        clearTimeout(connectionTimeout);
      }
      if (!mounted.current || currentGeneration !== generation.current) {
        session.close();
        return;
      }
      sessionRef.current = session;
      if (contextRef.current) sendView(session, contextRef.current);
      expiryTimer.current = setTimeout(
        () =>
          fail(
            "Sesi tutor selesai. Sambungkan kembali untuk melanjutkan belajar.",
          ),
        Math.max(0, Date.parse(data.expiresAt) - Date.now()),
      );
      await startMicrophone();
      trace("connected");
    } catch (caught) {
      if (currentGeneration !== generation.current || !mounted.current) return;
      const message =
        caught instanceof HttpError
          ? caught.message
          : caught instanceof DOMException && caught.name === "NotAllowedError"
            ? "Izin mikrofon ditolak. Izinkan mikrofon di browser, lalu sambungkan kembali."
            : caught instanceof Error && caught.message.includes("HTTPS")
              ? caught.message
              : "Tutor belum dapat disambungkan. Periksa jaringan dan izin mikrofon, lalu coba lagi.";
      await disconnect();
      if (mounted.current) {
        setError(message);
        setStatus("error");
      }
    } finally {
      if (currentGeneration === generation.current) connecting.current = false;
    }
  }, [disconnect, onMessage, resourceId, sendView, startMicrophone, trace]);

  const toggleMicrophone = useCallback(async () => {
    setError(null);
    if (microphoneRef.current) {
      micGeneration.current++;
      const mic = microphoneRef.current;
      microphoneRef.current = null;
      sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
      setListening(false);
      setLevel(0);
      setStatus(playing.current ? "speaking" : "paused");
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

  const stopExplanation = useCallback(() => {
    cancelTurn();
    setStatus(microphoneRef.current ? "listening" : "paused");
    trace("student-stopped");
  }, [cancelTurn, trace]);

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
    // Invalidate locally immediately; coalesce rapid scroll/resize updates on the wire.
    const timer = setTimeout(() => {
      if (
        sessionRef.current &&
        context &&
        contextRef.current?.revision === context.revision
      ) {
        try {
          sendView(sessionRef.current, context);
        } catch {
          setError("Konteks halaman belum terkirim. Sambungkan ulang tutor.");
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [context, sendView, trace]);

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
    guidance,
    inputTranscript,
    outputTranscript,
    listening,
    level,
    connected: !!sessionRef.current,
    start,
    disconnect,
    toggleMicrophone,
    stopExplanation,
    events,
  };
}

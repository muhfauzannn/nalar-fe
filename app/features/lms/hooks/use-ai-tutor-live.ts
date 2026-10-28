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
import {
  createTutorInputNode,
  decodeTutorAudio,
  LevelMeter,
  TUTOR_INPUT_MIME_TYPE,
} from "../lib/tutor-audio";
import type {
  AiTutorChannel,
  AiTutorMessage,
  AiTutorMode,
  AiTutorTarget,
} from "../types";

type ConnectionStatus = "idle" | "connecting" | "ready" | "responding" | "error";

type MicrophoneMessage = {
  type: "audio";
  pcm: ArrayBuffer;
  level: number;
};

export function useAiTutorLive(target: AiTutorTarget) {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [messages, setMessages] = useState<AiTutorMessage[]>([]);
  const [mode, setModeState] = useState<AiTutorMode>("hint");
  // "voice" while the student is in a spoken conversation: replies are played aloud. Typed
  // questions are answered as text only, and can be sent in either channel.
  const [channel, setChannel] = useState<AiTutorChannel>("chat");
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTutorSpeaking, setIsTutorSpeaking] = useState(false);
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");

  const mountedRef = useRef(true);
  const sessionRef = useRef<Session | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const modelRef = useRef<string | null>(null);
  const connectionGenerationRef = useRef(0);
  const modeRef = useRef<AiTutorMode>(mode);
  const channelRef = useRef<AiTutorChannel>(channel);
  const activeStudentEventRef = useRef<string | null>(null);
  const activeWasRedirectedRef = useRef(false);
  const replyEventRef = useRef<string | null>(null);
  const outputTextRef = useRef("");
  const inputTextRef = useRef("");
  const awaitingClassificationRef = useRef(false);
  const toolTurnPendingRef = useRef(false);
  const statusRef = useRef<ConnectionStatus>("idle");
  const connectingRef = useRef(false);
  // True while a scheduled reconnect is pending: what the student asks for meanwhile is queued.
  const waitingRef = useRef(false);
  const pendingIntentRef = useRef<{ text?: string; mic?: boolean }>({});
  const lastSentTextRef = useRef<string | null>(null);
  const maxSessionMs = useRef(DEFAULT_MAX_SESSION_MS);
  const connectRef = useRef<(mode?: AiTutorMode) => Promise<void>>(async () => {});
  const sendTextRef = useRef<(content: string) => Promise<boolean>>(async () => false);
  const toggleListeningRef = useRef<() => Promise<void>>(async () => {});
  const disarmRenewalRef = useRef<() => void>(() => {});
  const retry = useLiveRetry();
  const microphoneRef = useRef<{
    context: AudioContext;
    stream: MediaStream;
    source: MediaStreamAudioSourceNode;
    worklet: AudioWorkletNode;
    sink: GainNode;
  } | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const outputMeterRef = useRef<LevelMeter | null>(null);
  const inputLevelRef = useRef(0);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextPlaybackTimeRef = useRef(0);
  const playbackEpochRef = useRef(0);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const surface = target.targetType;
  const report = useCallback(
    (event: Omit<LiveSessionEvent, "surface">) => void aiTutorApi.reportEvent({ surface, ...event }),
    [surface],
  );

  useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  const appendMessage = useCallback((message: Omit<AiTutorMessage, "sequence">) => {
    setMessages((current) => [
      ...current,
      {
        ...message,
        sequence:
          current.reduce((highest, item) => Math.max(highest, item.sequence), 0) + 1,
      },
    ]);
  }, []);

  const stopPlayback = useCallback(() => {
    playbackEpochRef.current += 1;
    for (const source of outputSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // The source may already have ended.
      }
    }
    outputSourcesRef.current.clear();
    nextPlaybackTimeRef.current = 0;
    setIsTutorSpeaking(false);
  }, []);

  const playPcm = useCallback(async (base64: string, mimeType: string) => {
    if (channelRef.current !== "voice" || !activeStudentEventRef.current) return;
    const playbackEpoch = playbackEpochRef.current;
    let context = outputContextRef.current;
    if (!context) {
      context = new AudioContext({ sampleRate: 24_000 });
      outputContextRef.current = context;
      outputMeterRef.current = new LevelMeter(context);
      outputMeterRef.current.node.connect(context.destination);
    }
    if (context.state === "suspended") await context.resume();
    if (playbackEpoch !== playbackEpochRef.current || !activeStudentEventRef.current) return;

    const { samples, rate } = decodeTutorAudio(base64, mimeType);
    if (samples.length === 0) return;
    const audioBuffer = context.createBuffer(1, samples.length, rate);
    audioBuffer.copyToChannel(samples, 0);

    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputMeterRef.current?.node ?? context.destination);
    const startAt = Math.max(context.currentTime, nextPlaybackTimeRef.current);
    source.start(startAt);
    nextPlaybackTimeRef.current = startAt + audioBuffer.duration;
    outputSourcesRef.current.add(source);
    setIsTutorSpeaking(true);
    source.onended = () => {
      outputSourcesRef.current.delete(source);
      if (outputSourcesRef.current.size === 0) setIsTutorSpeaking(false);
    };
  }, []);

  const finalizeTutorTurn = useCallback(async () => {
    const content = outputTextRef.current.replace(/\s+/g, " ").trim();
    const studentEventId = activeStudentEventRef.current;
    const replyEventId = replyEventRef.current;
    const wasRedirected = activeWasRedirectedRef.current;
    outputTextRef.current = "";
    activeStudentEventRef.current = null;
    replyEventRef.current = null;
    activeWasRedirectedRef.current = false;
    const wasAwaitingClassification = awaitingClassificationRef.current;
    awaitingClassificationRef.current = false;
    lastSentTextRef.current = null;
    setOutputTranscript("");
    if (outputSourcesRef.current.size === 0) setIsTutorSpeaking(false);

    if (!content || !studentEventId || !replyEventId || !conversationIdRef.current) {
      if (wasAwaitingClassification && !studentEventId) {
        setError("Pesan belum berhasil diverifikasi. Silakan ulangi pertanyaanmu.");
      }
      awaitingClassificationRef.current = false;
      lastSentTextRef.current = null;
      inputTextRef.current = "";
      setInputTranscript("");
      setStatus("ready");
      return;
    }

    appendMessage({
      id: replyEventId,
      clientEventId: replyEventId,
      author: "tutor",
      content,
      mode: modeRef.current,
      wasRedirected,
      modelVersion: modelRef.current,
      quizQuestionId: target.targetType === "quiz" ? target.questionId : null,
      createdAt: new Date().toISOString(),
      intent: null,
    });
    setStatus("ready");
    try {
      await aiTutorApi.saveReply(conversationIdRef.current, {
        clientEventId: replyEventId,
        inReplyToEventId: studentEventId,
        questionId: target.targetType === "quiz" ? target.questionId : undefined,
        content,
        mode: modeRef.current,
      });
    } catch (caught) {
      setError(errorMessage(caught, "Transkrip respons tutor belum tersimpan."));
    }
  }, [appendMessage, target]);

  const handleToolCall = useCallback(
    async (message: LiveServerMessage) => {
      const session = sessionRef.current;
      const conversationId = conversationIdRef.current;
      if (!session || !conversationId) return;

      for (const call of message.toolCall?.functionCalls ?? []) {
        if (call.name !== "classify_student_prompt") continue;
        setStatus("responding");
        const content =
          typeof call.args?.content === "string" ? call.args.content.trim() : "";
        const studentEventId = crypto.randomUUID();
        try {
          const classification = await aiTutorApi.classify(conversationId, {
            clientEventId: studentEventId,
            questionId: target.targetType === "quiz" ? target.questionId : undefined,
            content,
            mode: modeRef.current,
          });
          activeStudentEventRef.current = studentEventId;
          activeWasRedirectedRef.current = classification.wasRedirected;
          awaitingClassificationRef.current = false;
          lastSentTextRef.current = null;
          replyEventRef.current = crypto.randomUUID();
          inputTextRef.current = "";
          setInputTranscript("");
          appendMessage({
            id: classification.messageId,
            clientEventId: studentEventId,
            author: "student",
            content,
            mode: modeRef.current,
            wasRedirected: false,
            modelVersion: null,
            quizQuestionId: target.targetType === "quiz" ? target.questionId : null,
            createdAt: new Date().toISOString(),
            intent: classification.intent,
          });
          setStatus("responding");
          session.sendToolResponse({
            functionResponses: {
              id: call.id,
              name: call.name,
              response: {
                intent: classification.intent,
                wasRedirected: classification.wasRedirected,
                responseInstruction: classification.responseInstruction,
              },
            },
          });
        } catch (caught) {
          awaitingClassificationRef.current = false;
          lastSentTextRef.current = null;
          setError(errorMessage(caught, "Pertanyaan suara belum dapat diverifikasi."));
          setStatus("ready");
          session.sendToolResponse({
            functionResponses: {
              id: call.id,
              name: call.name,
              response: {
                error: "Prompt classification failed. Do not answer substantively.",
              },
            },
          });
        }
      }
    },
    [appendMessage, target],
  );

  const handleServerMessage = useCallback(
    (message: LiveServerMessage) => {
      if (message.toolCall) {
        // Gemini closes the function-call turn before starting the tutor's
        // answer turn. Do not finalize the conversation on that first
        // turnComplete or the reply identifiers are cleared before audio lands.
        toolTurnPendingRef.current = true;
        void handleToolCall(message);
      }
      const serverContent = message.serverContent;
      const inputText = serverContent?.inputTranscription?.text;
      if (inputText) {
        if (!activeStudentEventRef.current) awaitingClassificationRef.current = true;
        inputTextRef.current += inputText;
        setInputTranscript(inputTextRef.current);
      }
      const outputText = serverContent?.outputTranscription?.text;
      if (outputText && activeStudentEventRef.current) {
        outputTextRef.current += outputText;
        setOutputTranscript(outputTextRef.current);
        setIsTutorSpeaking(true);
      }
      const audioParts = serverContent?.modelTurn?.parts?.filter(
        (part) =>
          part.inlineData?.data &&
          part.inlineData.mimeType?.startsWith("audio/"),
      );
      for (const part of audioParts ?? []) {
        const audioData = part.inlineData?.data;
        if (audioData) void playPcm(audioData, part.inlineData?.mimeType ?? "");
      }
      if (outputText || (audioParts?.length ?? 0) > 0) {
        toolTurnPendingRef.current = false;
      }
      if (serverContent?.interrupted) {
        stopPlayback();
        activeStudentEventRef.current = null;
        activeWasRedirectedRef.current = false;
        replyEventRef.current = null;
        outputTextRef.current = "";
        setOutputTranscript("");
      }
      if (serverContent?.turnComplete) {
        if (toolTurnPendingRef.current) {
          toolTurnPendingRef.current = false;
        } else {
          void finalizeTutorTurn();
        }
      }
    },
    [finalizeTutorTurn, handleToolCall, playPcm, stopPlayback],
  );

  // Closes everything the live session owns. Keeps queued intent and the retry timer, so a
  // reconnect that follows an unexpected drop can pick the student's request back up.
  const teardown = useCallback(async () => {
    connectionGenerationRef.current += 1;
    connectingRef.current = false;
    waitingRef.current = false;
    disarmRenewalRef.current();
    const microphone = microphoneRef.current;
    if (microphone) {
      microphone.worklet.disconnect();
      microphone.source.disconnect();
      microphone.sink.disconnect();
      for (const track of microphone.stream.getTracks()) track.stop();
      await microphone.context.close();
      microphoneRef.current = null;
    }
    setIsListening(false);
    inputLevelRef.current = 0;
    setIsTutorSpeaking(false);
    setInputTranscript("");
    setOutputTranscript("");
    sessionRef.current?.close();
    sessionRef.current = null;
    conversationIdRef.current = null;
    activeStudentEventRef.current = null;
    activeWasRedirectedRef.current = false;
    awaitingClassificationRef.current = false;
    lastSentTextRef.current = null;
    toolTurnPendingRef.current = false;
    replyEventRef.current = null;
    stopPlayback();
    setStatus("idle");
  }, [stopPlayback]);

  // The student (or unmount) ended it: nothing is retried or replayed afterwards.
  const disconnect = useCallback(async () => {
    retry.cancel();
    pendingIntentRef.current = {};
    lastSentTextRef.current = null;
    await teardown();
  }, [retry.cancel, teardown]);

  const runRetry = useCallback(() => {
    if (!mountedRef.current) return;
    waitingRef.current = false;
    void connectRef.current(modeRef.current);
  }, []);

  // Callbacks for one Live session. `holder.session` is that session once it exists: after a
  // renewal swapped it out, whatever the old socket still says is ignored.
  const callbacksFor = useCallback(
    (gen: number, holder: { session: Session | null }) => {
      const stale = () =>
        !mountedRef.current ||
        connectionGenerationRef.current !== gen ||
        (holder.session !== null && sessionRef.current !== holder.session);
      // The session was accepted and later ended without us asking.
      const lost = (info: LiveCloseInfo) => {
        if (stale()) return;
        const failure = classifyLiveClose(info, maxSessionMs.current);
        report({ event: "closed", phase: "live", kind: failure.kind, code: info.code, reason: info.reason, ageMs: info.ageMs });
        // What the student was in the middle of, so the new session can finish it.
        const text = awaitingClassificationRef.current ? lastSentTextRef.current : null;
        const wantedMic = microphoneRef.current !== null;
        void teardown().then(() => {
          if (!mountedRef.current) return;
          if (text) pendingIntentRef.current.text = text;
          if (wantedMic) pendingIntentRef.current.mic = true;
          const scheduled = retry.schedule(failure, runRetry, (attempt) =>
            report({ event: "retry_scheduled", kind: failure.kind, attempt }),
          );
          if (scheduled) {
            waitingRef.current = true;
            setStatus("connecting");
            return;
          }
          pendingIntentRef.current = {};
          setError(`${failure.message} Sambungkan ulang untuk melanjutkan.`);
          setStatus("error");
        });
      };
      return {
        onmessage: (message: LiveServerMessage) => {
          if (!stale()) handleServerMessage(message);
        },
        onerror: lost,
        onclose: lost,
      };
    },
    [handleServerMessage, report, retry.schedule, runRetry, teardown],
  );

  // Hands the conversation to a fresh session shortly before Google's 10-minute cut-off.
  const renew = useCallback(
    async (deadlineAt: number) => {
      const old = sessionRef.current;
      const gen = connectionGenerationRef.current;
      if (!old) return false;
      const replaced = () =>
        !mountedRef.current || connectionGenerationRef.current !== gen || sessionRef.current !== old;
      const holder: { session: Session | null } = { session: null };
      const began = Date.now();
      let next: Session | null = null;
      try {
        const data = await aiTutorApi.createSession(target, modeRef.current);
        if (data.maxSessionSeconds) maxSessionMs.current = data.maxSessionSeconds * 1000;
        next = await connectTutorLive(data.token, data.model, callbacksFor(gen, holder));
        holder.session = next;
        // Swap in a quiet moment so nothing the student is saying is split between two sessions.
        await waitUntil(
          () =>
            statusRef.current === "ready" &&
            outputSourcesRef.current.size === 0 &&
            !awaitingClassificationRef.current &&
            !toolTurnPendingRef.current,
          deadlineAt,
          { cancelled: replaced },
        );
        if (replaced()) {
          next.close();
          return false;
        }
        sessionRef.current = next;
        old.close();
        retry.markReady();
        report({ event: "renewed", phase: "live", ageMs: Date.now() - began });
        return true;
      } catch (error) {
        next?.close();
        const failure = classifyStartError(error, maxSessionMs.current);
        report({ event: "renew_failed", phase: "connect", kind: failure?.kind });
        return false;
      }
    },
    [callbacksFor, report, retry.markReady, target],
  );
  const renewal = useSessionRenewal(renew, () => maxSessionMs.current);
  disarmRenewalRef.current = renewal.disarm;

  const connect = useCallback(
    async (requestedMode: AiTutorMode = modeRef.current) => {
      if (sessionRef.current || connectingRef.current) return;
      connectingRef.current = true;
      waitingRef.current = false;
      const connectionGeneration = connectionGenerationRef.current + 1;
      connectionGenerationRef.current = connectionGeneration;
      setStatus("connecting");
      setError(null);
      const holder: { session: Session | null } = { session: null };
      try {
        const sessionData = await aiTutorApi.createSession(target, requestedMode);
        if (
          !mountedRef.current ||
          connectionGenerationRef.current !== connectionGeneration
        ) {
          return;
        }
        conversationIdRef.current = sessionData.conversationId;
        modelRef.current = sessionData.model;
        if (sessionData.maxSessionSeconds) maxSessionMs.current = sessionData.maxSessionSeconds * 1000;
        setMessages(sessionData.messages);
        const session = await connectTutorLive(
          sessionData.token,
          sessionData.model,
          callbacksFor(connectionGeneration, holder),
        );
        holder.session = session;
        if (
          !mountedRef.current ||
          connectionGenerationRef.current !== connectionGeneration
        ) {
          session.close();
          return;
        }
        sessionRef.current = session;
        setStatus("ready");
        retry.markReady();
        renewal.arm();
        // Finish what the student asked for while the tutor was unreachable.
        const intent = pendingIntentRef.current;
        pendingIntentRef.current = {};
        if (intent.text) void sendTextRef.current(intent.text);
        if (intent.mic) void toggleListeningRef.current();
      } catch (caught) {
        if (!mountedRef.current || connectionGenerationRef.current !== connectionGeneration) return;
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
          connectingRef.current = false;
          const scheduled = retry.schedule(failure, runRetry, (attempt) =>
            report({ event: "retry_scheduled", kind: failure.kind, attempt }),
          );
          if (scheduled) {
            waitingRef.current = true;
            setStatus("connecting");
            return;
          }
        }
        const unsent = pendingIntentRef.current.text;
        pendingIntentRef.current = {};
        const message = failure
          ? failure.autoRetry
            ? `${failure.message} Silakan coba lagi sebentar lagi.`
            : failure.message
          : errorMessage(caught, "AI Tutor belum dapat disambungkan.");
        setError(unsent ? `${message} Pesanmu belum terkirim.` : message);
        setStatus("error");
      } finally {
        if (connectionGenerationRef.current === connectionGeneration) connectingRef.current = false;
      }
    },
    [callbacksFor, renewal.arm, report, retry.attempts, retry.markReady, retry.schedule, runRetry, target],
  );
  connectRef.current = connect;

  // The student asked: a fresh retry allowance.
  const connectManually = useCallback(
    async (requestedMode?: AiTutorMode) => {
      retry.reset();
      await connect(requestedMode);
    },
    [connect, retry.reset],
  );

  const setMode = useCallback(
    async (nextMode: AiTutorMode) => {
      if (nextMode === modeRef.current) return;
      setModeState(nextMode);
      modeRef.current = nextMode;
      if (sessionRef.current) {
        await disconnect();
        await connect(nextMode);
      }
    },
    [connect, disconnect],
  );

  const setTutorChannel = useCallback(
    async (nextChannel: AiTutorChannel) => {
      setChannel(nextChannel);
      channelRef.current = nextChannel;
      if (nextChannel === "chat" && microphoneRef.current) {
        sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
        const microphone = microphoneRef.current;
        microphone.worklet.disconnect();
        microphone.source.disconnect();
        microphone.sink.disconnect();
        for (const track of microphone.stream.getTracks()) track.stop();
        await microphone.context.close();
        microphoneRef.current = null;
        setIsListening(false);
        inputLevelRef.current = 0;
        stopPlayback();
      }
    },
    [stopPlayback],
  );

  const sendText = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      const session = sessionRef.current;
      if (!content || status === "responding") return false;
      if (!session) {
        // A reconnect is on its way: keep the message and send it as soon as the tutor is back.
        if (!waitingRef.current) return false;
        pendingIntentRef.current.text = content;
        return true;
      }
      setError(null);
      try {
        lastSentTextRef.current = content;
        awaitingClassificationRef.current = true;
        setStatus("responding");
        session.sendRealtimeInput({ text: content });
        return true;
      } catch (caught) {
        setError(errorMessage(caught, "Pesan belum dapat dikirim."));
        setStatus("ready");
        return false;
      }
    },
    [status],
  );

  const toggleListening = useCallback(async () => {
    const session = sessionRef.current;
    if (!session && waitingRef.current && channelRef.current === "voice") {
      pendingIntentRef.current.mic = true;
      return;
    }
    if (!session || channelRef.current !== "voice") return;
    if (microphoneRef.current) {
      session.sendRealtimeInput({ audioStreamEnd: true });
      const microphone = microphoneRef.current;
      microphone.worklet.disconnect();
      microphone.source.disconnect();
      microphone.sink.disconnect();
      for (const track of microphone.stream.getTracks()) track.stop();
      await microphone.context.close();
      microphoneRef.current = null;
      setIsListening(false);
      inputLevelRef.current = 0;
      return;
    }

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const worklet = await createTutorInputNode(context, source);
      const sink = context.createGain();
      sink.gain.value = 0;
      worklet.connect(sink);
      sink.connect(context.destination);
      worklet.port.onmessage = (event: MessageEvent<MicrophoneMessage>) => {
        const currentSession = sessionRef.current;
        if (!currentSession || event.data.type !== "audio") return;
        inputLevelRef.current = event.data.level;
        const bytes = new Uint8Array(event.data.pcm);
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        currentSession.sendRealtimeInput({
          audio: { data: btoa(binary), mimeType: TUTOR_INPUT_MIME_TYPE },
        });
      };
      microphoneRef.current = { context, stream, source, worklet, sink };
      setIsListening(true);
    } catch (caught) {
      setError(
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "Izin mikrofon ditolak. Izinkan mikrofon atau gunakan chat teks."
          : "Mikrofon belum dapat digunakan pada perangkat ini.",
      );
    }
  }, []);

  sendTextRef.current = sendText;
  toggleListeningRef.current = toggleListening;

  // Opens the microphone, connecting first when needed. Replies are spoken from now on.
  const startVoice = useCallback(async () => {
    channelRef.current = "voice";
    setChannel("voice");
    if (!sessionRef.current && !waitingRef.current) await connectManually();
    if (!microphoneRef.current) await toggleListening();
  }, [connectManually, toggleListening]);

  // Back to text only; the session and the conversation stay.
  const endVoice = useCallback(() => setTutorChannel("chat"), [setTutorChannel]);

  // Loudness of whoever is speaking now, read by the voice orb every frame.
  const readLevel = useCallback(() => {
    if (outputSourcesRef.current.size > 0) return outputMeterRef.current?.level() ?? 0;
    return microphoneRef.current ? Math.min(1, inputLevelRef.current * 1.8) : 0;
  }, []);

  // Typed questions only and nothing happening: give the Live session back. The conversation
  // stays on screen and on the server (a new session gets it in its instructions); the next
  // question reconnects.
  useIdleClose(
    status === "ready" && channel === "chat" && !isListening && !isTutorSpeaking,
    () => {
      report({ event: "idle_closed", phase: "live" });
      void disconnect();
    },
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void disconnect();
      void outputContextRef.current?.close();
      outputContextRef.current = null;
      outputMeterRef.current = null;
    };
  }, [disconnect]);

  return {
    status,
    messages,
    mode,
    channel,
    error,
    notice: retry.notice,
    isListening,
    isTutorSpeaking,
    inputTranscript,
    outputTranscript,
    connect: connectManually,
    disconnect,
    setMode,
    sendText,
    toggleListening,
    startVoice,
    endVoice,
    readLevel,
  };
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError) return error.message;
  if (error instanceof TypeError) return "Koneksi terputus. Periksa jaringanmu lalu coba lagi.";
  return fallback;
}

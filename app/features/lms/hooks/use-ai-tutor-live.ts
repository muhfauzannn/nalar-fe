import { useCallback, useEffect, useRef, useState } from "react";
import { connectTutorLive, type LiveServerMessage, type Session } from "../lib/live-tutor-client";

import { HttpError } from "~/lib/http";
import { aiTutorApi } from "../api/ai-tutor";
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
  const [channel, setChannel] = useState<AiTutorChannel>("voice");
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
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
  const microphoneRef = useRef<{
    context: AudioContext;
    stream: MediaStream;
    source: MediaStreamAudioSourceNode;
    worklet: AudioWorkletNode;
    sink: GainNode;
  } | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextPlaybackTimeRef = useRef(0);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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

  const playPcm = useCallback(async (base64: string) => {
    if (channelRef.current !== "voice" || !activeStudentEventRef.current) return;
    let context = outputContextRef.current;
    if (!context) {
      context = new AudioContext({ sampleRate: 24_000 });
      outputContextRef.current = context;
    }
    if (context.state === "suspended") await context.resume();

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const sampleCount = Math.floor(bytes.byteLength / 2);
    if (sampleCount === 0) return;
    const view = new DataView(bytes.buffer);
    const audioBuffer = context.createBuffer(1, sampleCount, 24_000);
    const samples = audioBuffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      samples[index] = view.getInt16(index * 2, true) / 32_768;
    }

    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
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
    setOutputTranscript("");
    if (outputSourcesRef.current.size === 0) setIsTutorSpeaking(false);

    if (!content || !studentEventId || !replyEventId || !conversationIdRef.current) {
      if (wasAwaitingClassification && !studentEventId) {
        setError("Pesan belum berhasil diverifikasi. Silakan ulangi pertanyaanmu.");
      }
      awaitingClassificationRef.current = false;
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
        // The provider closes the function-call turn before starting the tutor's
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
        if (audioData) void playPcm(audioData);
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

  const disconnect = useCallback(async () => {
    connectionGenerationRef.current += 1;
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
    setInputLevel(0);
    setIsTutorSpeaking(false);
    setInputTranscript("");
    setOutputTranscript("");
    sessionRef.current?.close();
    sessionRef.current = null;
    conversationIdRef.current = null;
    activeStudentEventRef.current = null;
    activeWasRedirectedRef.current = false;
    awaitingClassificationRef.current = false;
    toolTurnPendingRef.current = false;
    replyEventRef.current = null;
    stopPlayback();
    setStatus("idle");
  }, [stopPlayback]);

  const connect = useCallback(
    async (requestedMode: AiTutorMode = modeRef.current) => {
      if (sessionRef.current || status === "connecting") return;
      const connectionGeneration = connectionGenerationRef.current + 1;
      connectionGenerationRef.current = connectionGeneration;
      setStatus("connecting");
      setError(null);
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
        setMessages(sessionData.messages);
        const session = await connectTutorLive(sessionData.token, sessionData.model, {
            onopen: () => mountedRef.current && setStatus("ready"),
            onmessage: (message) => {
              if (mountedRef.current && connectionGenerationRef.current === connectionGeneration)
                handleServerMessage(message);
            },
            onerror: (message) => {
              if (!mountedRef.current || connectionGenerationRef.current !== connectionGeneration) return;
              void disconnect().finally(() => {
                if (!mountedRef.current) return;
                setError(message ?? "Koneksi tutor mengalami gangguan. Coba sambungkan ulang.");
                setStatus("error");
              });
            },
            onclose: () => {
              if (!mountedRef.current || !sessionRef.current) return;
              sessionRef.current = null;
              setIsListening(false);
              setInputLevel(0);
              setIsTutorSpeaking(false);
              setStatus("idle");
            },
        });
        if (
          !mountedRef.current ||
          connectionGenerationRef.current !== connectionGeneration
        ) {
          session.close();
          return;
        }
        sessionRef.current = session;
        setStatus("ready");
      } catch (caught) {
        if (!mountedRef.current) return;
        setError(errorMessage(caught, "AI Tutor belum dapat disambungkan."));
        setStatus("error");
      }
    },
    [disconnect, handleServerMessage, status, target],
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
        setInputLevel(0);
        stopPlayback();
      }
    },
    [stopPlayback],
  );

  const sendText = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      const session = sessionRef.current;
      if (!content || !session || status === "responding") return false;
      setError(null);
      try {
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
      setInputLevel(0);
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
      await context.audioWorklet.addModule("/audio/nalar-input-processor.js");
      const source = context.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(context, "nalar-input-processor");
      const sink = context.createGain();
      sink.gain.value = 0;
      source.connect(worklet);
      worklet.connect(sink);
      sink.connect(context.destination);
      worklet.port.onmessage = (event: MessageEvent<MicrophoneMessage>) => {
        const currentSession = sessionRef.current;
        if (!currentSession || event.data.type !== "audio") return;
        setInputLevel(event.data.level);
        const bytes = new Uint8Array(event.data.pcm);
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        currentSession.sendRealtimeInput({
          audio: { data: btoa(binary), mimeType: "audio/pcm;rate=24000" },
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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void disconnect();
      void outputContextRef.current?.close();
      outputContextRef.current = null;
    };
  }, [disconnect]);

  return {
    status,
    messages,
    mode,
    channel,
    error,
    isListening,
    inputLevel,
    isUserSpeaking: isListening && inputLevel > 0.06,
    isTutorSpeaking,
    inputTranscript,
    outputTranscript,
    connect,
    disconnect,
    setMode,
    setChannel: setTutorChannel,
    sendText,
    toggleListening,
  };
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError) return error.message;
  if (error instanceof TypeError) return "Koneksi terputus. Periksa jaringanmu lalu coba lagi.";
  return fallback;
}

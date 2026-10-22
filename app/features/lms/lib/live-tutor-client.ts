/** Direct OpenAI Realtime connection authenticated with a short-lived server token. */
export type LiveServerMessage = {
  serverContent?: {
    inputStarted?: boolean;
    inputTranscription?: { text: string };
    outputTranscription?: { text: string };
    modelTurn?: { parts: Array<{ inlineData?: { data: string; mimeType: string } }> };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
  toolCall?: { functionCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> };
  toolCallCancellation?: { ids: string[] };
};

type ToolResponse = { id?: string; name?: string; response: Record<string, unknown> };
export interface Session {
  sendRealtimeInput(input: { text?: string; audio?: { data: string; mimeType: string }; video?: { data: string; mimeType: string }; audioStreamEnd?: boolean }): void;
  sendClientContent(input: { turns: Array<{ role: string; parts: Array<{ text: string }> }>; turnComplete: boolean }): void;
  sendToolResponse(input: { functionResponses: ToolResponse | ToolResponse[] }): void;
  interrupt(): void;
  close(): void;
}

type Callbacks = {
  onopen?: () => void;
  onmessage: (message: LiveServerMessage) => void;
  onerror?: (message?: string) => void;
  onclose?: () => void;
};

export function connectTutorLive(token: string, model: string, callbacks: Callbacks): Promise<Session> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, [
      "realtime", `openai-insecure-api-key.${token}`,
    ]);
    let ready = false;
    let closed = false;
    let activeResponse: string | null = null;
    let guardrailComplete = false;
    const ignoredResponses = new Set<string>();
    const pendingCalls = new Set<string>();
    const send = (event: Record<string, unknown>) => {
      if (socket.readyState !== WebSocket.OPEN) throw new Error("Tutor connection closed");
      socket.send(JSON.stringify(event));
    };
    const requestResponse = (continuation = false) => send({ type: "response.create",
      ...(continuation ? { response: { tool_choice: "auto" } } : {}),
    });
    const interrupt = () => {
      guardrailComplete = false;
      if (activeResponse) {
        ignoredResponses.add(activeResponse);
        send({ type: "response.cancel", response_id: activeResponse });
        activeResponse = null;
      }
      if (pendingCalls.size) {
        const ids = [...pendingCalls];
        pendingCalls.clear();
        for (const id of ids) send({ type: "conversation.item.create", item: {
          type: "function_call_output", call_id: id,
          output: JSON.stringify({ ok: false, error: "Student interrupted or PDF context changed. Wait for a new question." }),
        } });
        callbacks.onmessage({ toolCallCancellation: { ids } });
      }
    };
    const session: Session = {
      sendRealtimeInput(input) {
        if (input.audio) send({ type: "input_audio_buffer.append", audio: input.audio.data });
        if (input.audioStreamEnd) {
          // Let VAD commit the last utterance when the microphone is paused mid-speech.
          // Explicitly clearing the buffer would discard the student's final words.
          send({ type: "input_audio_buffer.append", audio: btoa("\0".repeat(24_000 * 2 * 0.6)) });
        }
        if (input.video) send({ type: "conversation.item.create", item: {
          type: "message", role: "user",
          content: [{ type: "input_image", image_url: `data:${input.video.mimeType};base64,${input.video.data}` }],
        } });
        if (input.text) session.sendClientContent({ turns: [{ role: "user", parts: [{ text: input.text }] }], turnComplete: true });
      },
      sendClientContent(input) {
        for (const turn of input.turns) send({ type: "conversation.item.create", item: {
          type: "message", role: turn.role,
          content: turn.parts.map((part) => ({ type: "input_text", text: part.text })),
        } });
        // PDF_VIEW_STATE updates must never trigger speech.
        if (input.turnComplete) {
          guardrailComplete = false;
          requestResponse();
        }
      },
      sendToolResponse(input) {
        let sent = false;
        for (const result of Array.isArray(input.functionResponses) ? input.functionResponses : [input.functionResponses]) {
          if (!result.id || !pendingCalls.delete(result.id)) continue;
          sent = true;
          if (!result.response.error && result.response.ok !== false) guardrailComplete = true;
          send({ type: "conversation.item.create", item: {
            type: "function_call_output", call_id: result.id, output: JSON.stringify(result.response),
          } });
        }
        if (sent && !pendingCalls.size) requestResponse(true);
      },
      interrupt,
      close() {
        closed = true;
        clearTimeout(timeout);
        socket.close();
      },
    };
    const timeout = setTimeout(() => {
      session.close();
      reject(new Error("Tutor connection timed out"));
    }, 20_000);
    socket.onmessage = (message) => {
      if (closed) return;
      try {
        const event = JSON.parse(String(message.data));
        if (event.type === "session.created") {
          ready = true;
          clearTimeout(timeout);
          resolve(session);
          // Let the caller assign its session ref before dispatching application events.
          queueMicrotask(() => callbacks.onopen?.());
          return;
        }
        if (event.type === "error") {
          // A VAD interruption may race an explicit cancellation.
          if (event.error?.code === "response_cancel_not_active") return;
          if (!ready) reject(new Error("Tutor session rejected"));
          callbacks.onerror?.(event.error?.code === "credit_balance_exhausted" || event.error?.code === "insufficient_quota"
            ? "Kuota layanan tutor habis. Hubungi pengajar untuk melanjutkan."
            : "Koneksi tutor mengalami gangguan. Silakan sambungkan ulang.");
          return;
        }
        if (event.type === "response.created") activeResponse = event.response.id;
        if (event.type === "input_audio_buffer.speech_started") {
          interrupt();
          callbacks.onmessage({ serverContent: { interrupted: true, inputStarted: true } });
        }
        if (event.type === "conversation.item.input_audio_transcription.completed") {
          callbacks.onmessage({ serverContent: { inputTranscription: { text: event.transcript } } });
        }
        if (ignoredResponses.has(event.response_id ?? event.response?.id)) return;
        // Realtime may speak a preamble even with a forced tool choice. Never forward
        // that audio or transcript before the application has acknowledged the tool.
        if (guardrailComplete && event.type === "response.output_audio.delta") callbacks.onmessage({ serverContent: {
          modelTurn: { parts: [{ inlineData: { data: event.delta, mimeType: "audio/pcm;rate=24000" } }] },
        } });
        if (guardrailComplete && (event.type === "response.output_audio_transcript.delta" || event.type === "response.output_text.delta")) {
          callbacks.onmessage({ serverContent: { outputTranscription: { text: event.delta } } });
        }
        if (event.type === "response.done") {
          activeResponse = null;
          if (event.response.status === "cancelled") return;
          if (event.response.status === "failed") { callbacks.onerror?.(); return; }
          const calls = (event.response.output ?? []).filter((item: { type: string }) => item.type === "function_call");
          for (const call of calls) pendingCalls.add(call.call_id);
          callbacks.onmessage({
            ...(calls.length ? { toolCall: { functionCalls: calls.map((call: { call_id: string; name: string; arguments: string }) => ({
              id: call.call_id, name: call.name, args: JSON.parse(call.arguments || "{}"),
            })) } } : {}),
            serverContent: { turnComplete: true },
          });
        }
        // Bound cancellation memory over a long session.
        if (ignoredResponses.size > 100) ignoredResponses.delete(ignoredResponses.values().next().value!);
      } catch {
        callbacks.onerror?.();
      }
    };
    socket.onerror = () => {
      if (closed) return;
      clearTimeout(timeout);
      if (!ready) reject(new Error("Tutor connection failed"));
      callbacks.onerror?.();
    };
    socket.onclose = () => {
      clearTimeout(timeout);
      if (!ready) reject(new Error("Tutor connection closed"));
      if (!closed) callbacks.onclose?.();
    };
  });
}

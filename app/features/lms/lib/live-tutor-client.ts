/** Gemini Live connection authenticated with a single-use token minted by the backend. */
import type { LiveServerMessage, Session } from "@google/genai";

export type { LiveServerMessage, Session };

type Callbacks = {
  onopen?: () => void;
  onmessage: (message: LiveServerMessage) => void;
  onerror?: () => void;
  onclose?: () => void;
};

/**
 * Opt-in latency trace: `localStorage.setItem("nalar:tutor-trace", "1")`, reconnect the tutor.
 * One row per student turn, in ms after the last input transcription (≈ end of speech), is
 * logged with console.table and kept in `window.__nalarTutorTrace`. Off by default.
 */
function tutorTracer() {
  let enabled = false;
  try { enabled = localStorage.getItem("nalar:tutor-trace") === "1"; } catch { /* Storage blocked. */ }
  if (!enabled) return null;
  const rows: Record<string, unknown>[] = ((window as unknown as { __nalarTutorTrace?: Record<string, unknown>[] }).__nalarTutorTrace ??= []);
  let heard = 0;
  let marks: Record<string, number> | null = null;
  let up = 0;
  let down = 0;
  const mark = (name: string) => { if (marks) marks[name] ??= Math.round(performance.now() - heard); };
  return {
    sent(size: number) { up += size; },
    message(message: LiveServerMessage) {
      down += JSON.stringify(message).length;
      const server = message.serverContent;
      if (server?.inputTranscription?.text) {
        heard = performance.now();
        marks ??= {};
      }
      if (message.toolCall) mark("toolCall");
      if (server?.modelTurn?.parts?.some((part) => part.inlineData?.mimeType?.startsWith("audio/"))) mark("firstAudio");
      if (server?.turnComplete && marks && !message.toolCall && marks.firstAudio !== undefined) {
        mark("turnComplete");
        rows.push({ ...marks, upKB: Math.round(up / 1024), downKB: Math.round(down / 1024) });
        console.table(rows.slice(-10));
        marks = null;
        up = 0;
        down = 0;
      }
    },
  };
}

export async function connectTutorLive(token: string, model: string, callbacks: Callbacks): Promise<Session> {
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });
  const trace = tutorTracer();
  const session = await client.live.connect({
    model,
    // The token's liveConnectConstraints carry the whole server-side configuration.
    config: {},
    callbacks: {
      onopen: () => callbacks.onopen?.(),
      onmessage: (message) => {
        trace?.message(message);
        callbacks.onmessage(message);
      },
      onerror: () => callbacks.onerror?.(),
      onclose: () => callbacks.onclose?.(),
    },
  });
  if (!trace) return session;
  const sendRealtimeInput = session.sendRealtimeInput.bind(session);
  session.sendRealtimeInput = (input) => {
    trace.sent(JSON.stringify(input).length);
    sendRealtimeInput(input);
  };
  return session;
}

/** Gemini Live connection authenticated with a single-use token minted by the backend. */
import type { LiveServerMessage, Session } from "@google/genai";

export type { LiveServerMessage, Session };

/** Why a Live socket ended, as far as the browser can tell. */
export type LiveCloseInfo = {
  code?: number;
  reason?: string;
  /** ms from the start of the connection attempt to the end. */
  ageMs: number;
  /** The server had accepted the session (setupComplete) before it ended. */
  ready: boolean;
};

/** The session never became ready: refused (quota, expired token), closed early or timed out. */
export class LiveConnectError extends Error {
  constructor(public readonly info: LiveCloseInfo, message = "Tutor Live connection failed") {
    super(message);
    this.name = "LiveConnectError";
  }
}

type Callbacks = {
  /** Fired once the server accepted the session. */
  onopen?: () => void;
  onmessage: (message: LiveServerMessage) => void;
  /** Only for sessions that were ready; a failed connection rejects connectTutorLive instead. */
  onerror?: (info: LiveCloseInfo) => void;
  /** Only for sessions that were ready and that we did not close ourselves. */
  onclose?: (info: LiveCloseInfo) => void;
};

const CONNECT_TIMEOUT_MS = 20_000;

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

/**
 * Resolves when the server has accepted the session (setupComplete), not when the socket opens:
 * a refused session (quota, expired token) opens fine and is closed ~1.5 s later, so resolving
 * earlier would let the mic start talking into a session that is about to be dropped.
 *
 * The SDK's own connect() waits for setupComplete too, but if the socket is closed first its
 * promise never settles - it neither resolves nor rejects. Left alone, a refused session would
 * leave the tutor on "connecting" forever, so the attempt races the close event and a timeout.
 */
export async function connectTutorLive(
  token: string,
  model: string,
  callbacks: Callbacks,
  options: { timeoutMs?: number } = {},
): Promise<Session> {
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });
  const trace = tutorTracer();
  const startedAt = performance.now();
  let ready = false;
  let closing = false;
  let abandoned = false;
  let refuse: (error: LiveConnectError) => void = () => {};
  const refused = new Promise<never>((_, reject) => {
    refuse = reject;
  });
  // A refusal can land before anyone awaits it; the race below still sees the rejection.
  refused.catch(() => {});
  const info = (event?: { code?: number; reason?: string }): LiveCloseInfo => ({
    code: typeof event?.code === "number" ? event.code : undefined,
    reason: typeof event?.reason === "string" ? event.reason : undefined,
    ageMs: Math.round(performance.now() - startedAt),
    ready,
  });

  const connecting = client.live.connect({
    model,
    // The token's liveConnectConstraints carry the whole server-side configuration.
    config: {},
    callbacks: {
      onopen: () => {},
      // The SDK holds messages back until the session is accepted, then delivers them in order.
      onmessage: (message) => {
        if (!ready && message.setupComplete) {
          ready = true;
          callbacks.onopen?.();
        }
        trace?.message(message);
        callbacks.onmessage(message);
      },
      // The browser's error event carries no detail; the close event that follows does.
      onerror: () => {
        if (ready && !closing) callbacks.onerror?.(info());
      },
      onclose: (event) => {
        if (!ready) refuse(new LiveConnectError(info(event)));
        else if (!closing) callbacks.onclose?.(info(event));
      },
    },
  });
  // If we gave up (timeout) and the server accepts the session after all, do not leave it open.
  connecting.then(
    (late) => {
      if (abandoned) late.close();
    },
    () => {},
  );

  const timer = setTimeout(() => {
    abandoned = true;
    refuse(new LiveConnectError({ ...info(), reason: "setup timeout" }));
  }, options.timeoutMs ?? CONNECT_TIMEOUT_MS);
  let session: Session;
  try {
    session = await Promise.race([connecting, refused]);
  } catch (error) {
    abandoned = true;
    throw error instanceof LiveConnectError
      ? error
      : new LiveConnectError({ ...info(), reason: error instanceof Error ? error.message.slice(0, 200) : undefined });
  } finally {
    clearTimeout(timer);
  }

  const close = session.close.bind(session);
  session.close = () => {
    closing = true;
    close();
  };
  if (!trace) return session;
  const sendRealtimeInput = session.sendRealtimeInput.bind(session);
  session.sendRealtimeInput = (input) => {
    trace.sent(JSON.stringify(input).length);
    sendRealtimeInput(input);
  };
  return session;
}

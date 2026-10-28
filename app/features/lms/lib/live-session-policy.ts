/**
 * What a failed or ended Gemini Live connection means, and what to do about it. Pure functions:
 * the hooks decide when to call them, this file decides what the student reads and whether
 * trying again can help. What was measured against the real service (Oct 2026):
 *  - a key carries only about 6 Live sessions that stay open at once; past that the socket opens
 *    and Google closes it with 1011 "You exceeded your current quota" about 1.5 s later, and the
 *    SDK's connect() then never settles (see connectTutorLive). Sessions closed within a couple of
 *    seconds of opening do not count, and room comes back as sessions end;
 *  - every connection is cut at 10 minutes (1011 "The service is currently unavailable"), with
 *    no goAway beforehand;
 *  - a token used later than its newSessionExpireTime is closed with "new_session_expire_time
 *    deadline exceeded".
 */
import { LiveConnectError, type LiveCloseInfo } from "./live-tutor-client";

// ~/lib/http reads browser-only env at import time; match its errors by shape so this file stays
// importable (and testable) anywhere.
type HttpErrorLike = Error & { name: "HttpError"; status: number; code?: string; retryAfterSeconds?: number };
const isHttpError = (error: unknown): error is HttpErrorLike =>
  error instanceof Error && error.name === "HttpError" && typeof (error as { status?: unknown }).status === "number";

export type LiveFailureKind =
  | "quota"
  | "token_expired"
  | "session_limit"
  | "busy"
  | "unavailable"
  | "network"
  | "offline"
  | "unknown";

export type LiveFailure = {
  kind: LiveFailureKind;
  /** Shown to the student. */
  message: string;
  /** Worth trying again without the student pressing anything. */
  autoRetry: boolean;
  /** How long the server/provider told us to wait; null = use the backoff table. */
  retryAfterMs: number | null;
  code?: number;
  reason?: string;
  ageMs?: number;
};

export const DEFAULT_MAX_SESSION_MS = 600_000;
export const MAX_AUTO_RETRIES = 3;
/** Longest wait we sit through on our own; beyond it the student decides. */
export const MAX_AUTO_RETRY_WAIT_MS = 90_000;
const RENEW_LEAD_MS = 45_000;
const RENEW_DEADLINE_LEAD_MS = 12_000;
/** A session that lived this long counts as healthy: the retry allowance starts over. */
export const HEALTHY_AFTER_MS = 30_000;

export function renewalPlan(maxSessionMs: number) {
  const max = Math.max(maxSessionMs, 120_000);
  return { renewAfterMs: max - RENEW_LEAD_MS, deadlineMs: max - RENEW_DEADLINE_LEAD_MS };
}

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

export function classifyLiveClose(
  info: Pick<LiveCloseInfo, "code" | "reason" | "ageMs" | "ready">,
  maxSessionMs = DEFAULT_MAX_SESSION_MS,
): LiveFailure {
  const reason = info.reason ?? "";
  const base = { code: info.code, reason: reason.slice(0, 200), ageMs: info.ageMs, retryAfterMs: null };
  if (/quota|resource.?exhausted|rate.?limit/i.test(reason)) {
    return { ...base, kind: "quota", autoRetry: true, message: "Tutor sedang ramai dipakai (batas layanan AI sementara tercapai)." };
  }
  if (!info.ready && /new_session_expire_time|expire/i.test(reason)) {
    return { ...base, kind: "token_expired", autoRetry: true, message: "Koneksi tutor terlambat dimulai." };
  }
  if (info.ready && info.ageMs >= maxSessionMs - 20_000) {
    return { ...base, kind: "session_limit", autoRetry: true, message: "Sesi tutor mencapai batas waktu 10 menit." };
  }
  if (isOffline()) {
    return { ...base, kind: "offline", autoRetry: false, message: "Kamu sedang offline. Sambungkan internet lalu coba lagi." };
  }
  if (/unavailable|overload|try again|internal/i.test(reason) || info.code === 1011 || info.code === 1012 || info.code === 1013) {
    return { ...base, kind: "unavailable", autoRetry: true, message: "Layanan AI sedang tidak tersedia sesaat." };
  }
  if (info.code === undefined || info.code === 0 || info.code === 1001 || info.code === 1005 || info.code === 1006) {
    return { ...base, kind: "network", autoRetry: info.ready, message: "Koneksi tutor terputus. Periksa jaringanmu." };
  }
  return { ...base, kind: "unknown", autoRetry: false, message: `Sesi tutor terputus (kode ${info.code}).` };
}

/**
 * Classifies whatever stopped a connection attempt: the API refusing a token (429 busy), the Live
 * socket closing before it was ready, or the browser failing to reach either. Returns null for
 * errors this file has no opinion on (microphone permission, bad input, ...).
 */
export function classifyStartError(error: unknown, maxSessionMs = DEFAULT_MAX_SESSION_MS): LiveFailure | null {
  if (error instanceof LiveConnectError) return classifyLiveClose(error.info, maxSessionMs);
  if (isHttpError(error)) {
    if (error.status === 429) {
      const retryAfterMs = error.retryAfterSeconds ? error.retryAfterSeconds * 1000 : null;
      return {
        kind: "busy",
        message: retryAfterMs && retryAfterMs > MAX_AUTO_RETRY_WAIT_MS
          ? `${error.message} Coba lagi sekitar ${Math.ceil(retryAfterMs / 60_000)} menit lagi.`
          : error.message,
        autoRetry: retryAfterMs !== null && retryAfterMs <= MAX_AUTO_RETRY_WAIT_MS,
        retryAfterMs,
      };
    }
    return null;
  }
  if (error instanceof TypeError) {
    return {
      kind: isOffline() ? "offline" : "network",
      message: isOffline() ? "Kamu sedang offline. Sambungkan internet lalu coba lagi." : "Koneksi terputus. Periksa jaringanmu lalu coba lagi.",
      autoRetry: false,
      retryAfterMs: null,
    };
  }
  return null;
}

/** Milliseconds to wait before attempt number `attempt` (0-based). `random` is injectable for tests. */
export function retryDelayMs(failure: LiveFailure, attempt: number, random: () => number = Math.random): number {
  if (failure.retryAfterMs !== null) {
    return Math.min(failure.retryAfterMs, MAX_AUTO_RETRY_WAIT_MS) + Math.round(random() * 2_000);
  }
  const pick = (table: number[], jitter: number) =>
    (table[Math.min(attempt, table.length - 1)] ?? table[0]!) + Math.round(random() * jitter);
  switch (failure.kind) {
    case "token_expired":
    case "session_limit":
      return pick([300], 500);
    case "quota":
      return pick([15_000, 30_000, 60_000], 5_000);
    default:
      return pick([2_000, 5_000, 10_000], 1_000);
  }
}

export function retryNotice(failure: LiveFailure, delayMs: number) {
  if (delayMs < 1_500) return `${failure.message} Menyambungkan ulang…`;
  return `${failure.message} Mencoba lagi dalam ${Math.ceil(delayMs / 1_000)} detik…`;
}

/** Resolves true as soon as `ready()` holds, false once `deadlineAt` (epoch ms) passes or it is cancelled. */
export async function waitUntil(
  ready: () => boolean,
  deadlineAt: number,
  options: { pollMs?: number; cancelled?: () => boolean } = {},
): Promise<boolean> {
  const pollMs = options.pollMs ?? 250;
  while (!options.cancelled?.()) {
    if (ready()) return true;
    if (Date.now() >= deadlineAt) return false;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  return false;
}

import { test, expect } from "@playwright/test";
import {
  classifyLiveClose,
  classifyStartError,
  MAX_AUTO_RETRY_WAIT_MS,
  renewalPlan,
  retryDelayMs,
  retryNotice,
  waitUntil,
} from "../app/features/lms/lib/live-session-policy";
import { LiveConnectError } from "../app/features/lms/lib/live-tutor-client";

const QUOTA = "You exceeded your current quota, please check your plan and billing details.";

test.describe("what a closed Live socket means", () => {
  test("a refused session is quota, whatever the numbers say", () => {
    const failure = classifyLiveClose({ code: 1011, reason: QUOTA, ageMs: 1800, ready: false });
    expect(failure).toMatchObject({ kind: "quota", autoRetry: true, code: 1011 });
    expect(failure.message).toContain("sedang ramai");
  });

  test("the 10-minute cut-off is recognised by age, not just by its vague reason", () => {
    const cut = classifyLiveClose({ code: 1011, reason: "The service is currently unavailable.", ageMs: 600_600, ready: true });
    expect(cut.kind).toBe("session_limit");
    expect(cut.autoRetry).toBe(true);
    // The same words a minute into a session are an ordinary outage.
    const outage = classifyLiveClose({ code: 1011, reason: "The service is currently unavailable.", ageMs: 60_000, ready: true });
    expect(outage.kind).toBe("unavailable");
  });

  test("a token used too late is its own case and only before the session was ready", () => {
    const late = classifyLiveClose({ code: 1011, reason: "new_session_expire_time deadline exceeded", ageMs: 400, ready: false });
    expect(late).toMatchObject({ kind: "token_expired", autoRetry: true });
  });

  test("a dropped network is retried only when a session had been working", () => {
    expect(classifyLiveClose({ code: 1006, ageMs: 90_000, ready: true })).toMatchObject({ kind: "network", autoRetry: true });
    expect(classifyLiveClose({ code: 1006, ageMs: 900, ready: false })).toMatchObject({ kind: "network", autoRetry: false });
  });

  test("anything unrecognised is shown with its code and not retried blindly", () => {
    const failure = classifyLiveClose({ code: 1008, reason: "policy", ageMs: 500, ready: true });
    expect(failure).toMatchObject({ kind: "unknown", autoRetry: false });
    expect(failure.message).toContain("1008");
  });

  test("the reason that reaches a log or the student is trimmed", () => {
    expect(classifyLiveClose({ code: 1011, reason: "x".repeat(900), ageMs: 1, ready: false }).reason).toHaveLength(200);
  });
});

test.describe("what stopped a connection attempt", () => {
  const http = (status: number, code: string, message: string, retryAfterSeconds?: number) =>
    Object.assign(new Error(message), { name: "HttpError", status, code, retryAfterSeconds });

  test("a Live socket closed before it was ready is classified like a close", () => {
    const error = new LiveConnectError({ code: 1011, reason: QUOTA, ageMs: 1500, ready: false });
    expect(classifyStartError(error)).toMatchObject({ kind: "quota", autoRetry: true });
  });

  test("a 429 with a short Retry-After becomes a countdown", () => {
    const failure = classifyStartError(http(429, "AI_TUTOR_RATE_LIMITED", "Terlalu banyak sesi AI Tutor dalam waktu singkat.", 20));
    expect(failure).toMatchObject({ kind: "busy", autoRetry: true, retryAfterMs: 20_000 });
    expect(failure!.message).toBe("Terlalu banyak sesi AI Tutor dalam waktu singkat.");
  });

  test("a 429 without a wait time is not retried blindly", () => {
    expect(classifyStartError(http(429, "AI_TUTOR_RATE_LIMITED", "Terlalu banyak."))).toMatchObject({ kind: "busy", autoRetry: false, retryAfterMs: null });
  });

  test("a long wait is left to the student and says how long", () => {
    const failure = classifyStartError(http(429, "AI_TUTOR_RATE_LIMITED", "Terlalu banyak sesi.", 240));
    expect(failure).toMatchObject({ kind: "busy", autoRetry: false, retryAfterMs: 240_000 });
    expect(failure!.message).toContain("4 menit");
    expect(240_000).toBeGreaterThan(MAX_AUTO_RETRY_WAIT_MS);
  });

  test("errors it has no opinion on are left to the caller", () => {
    expect(classifyStartError(http(404, "AI_TUTOR_TARGET_NOT_FOUND", "Tidak ditemukan"))).toBeNull();
    expect(classifyStartError(new Error("Izin mikrofon ditolak"))).toBeNull();
    expect(classifyStartError("boom")).toBeNull();
  });

  test("a fetch failure is a network problem", () => {
    expect(classifyStartError(new TypeError("Failed to fetch"))).toMatchObject({ kind: "network", autoRetry: false });
  });
});

test.describe("timing", () => {
  test("backoff grows with each attempt and is capped by what the server asked", () => {
    const quota = classifyLiveClose({ code: 1011, reason: QUOTA, ageMs: 1500, ready: false });
    const noJitter = () => 0;
    expect([0, 1, 2, 3].map((n) => retryDelayMs(quota, n, noJitter))).toEqual([15_000, 30_000, 60_000, 60_000]);
    const cut = classifyLiveClose({ code: 1011, reason: "unavailable", ageMs: 600_000, ready: true });
    expect(retryDelayMs(cut, 0, noJitter)).toBe(300);
    const busy = classifyStartError(Object.assign(new Error("x"), { name: "HttpError", status: 429, code: "AI_TUTOR_RATE_LIMITED", retryAfterSeconds: 45 }))!;
    expect(retryDelayMs(busy, 2, noJitter)).toBe(45_000);
    // Jitter spreads a whole class retrying together.
    expect(retryDelayMs(quota, 0, () => 1)).toBe(20_000);
  });

  test("the notice counts down, and says reconnecting when the wait is short", () => {
    const quota = classifyLiveClose({ code: 1011, reason: QUOTA, ageMs: 1500, ready: false });
    expect(retryNotice(quota, 14_200)).toContain("Mencoba lagi dalam 15 detik");
    expect(retryNotice(quota, 300)).toContain("Menyambungkan ulang");
  });

  test("renewal starts well before the cut-off and gives up shortly before it", () => {
    expect(renewalPlan(600_000)).toEqual({ renewAfterMs: 555_000, deadlineMs: 588_000 });
    // A short cap reported by the server never makes this fire immediately.
    expect(renewalPlan(10_000).renewAfterMs).toBeGreaterThan(60_000);
  });

  test("waitUntil returns as soon as the condition holds, or false at the deadline or when cancelled", async () => {
    let ready = false;
    setTimeout(() => (ready = true), 40);
    expect(await waitUntil(() => ready, Date.now() + 2_000, { pollMs: 10 })).toBe(true);
    expect(await waitUntil(() => false, Date.now() + 60, { pollMs: 10 })).toBe(false);
    expect(await waitUntil(() => false, Date.now() + 5_000, { pollMs: 10, cancelled: () => true })).toBe(false);
  });
});

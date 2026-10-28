import { test, expect, type Page, type WebSocketRoute } from "@playwright/test";
import { studyPdf } from "./fixtures/pdf";

// How the tutors behave when Gemini Live refuses, drops or caps a session. The numbers in the
// scripted failures are the ones measured against the real service: a key may open about 6 new
// sessions per ~5 minutes (the 7th is closed with 1011 "exceeded your current quota" ~1.5 s after
// the socket opens) and every connection is cut at 10 minutes with "service is currently
// unavailable".
const QUOTA = "You exceeded your current quota, please check your plan and billing details.";
const CUT = "The service is currently unavailable.";
const QUESTION = "Berikan jawaban soal ini";
const cors = {
  "access-control-allow-origin": "http://127.0.0.1:4174",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
};

type Live = "ready" | "quota";
type Reply = { status: number; body: Record<string, unknown>; headers?: Record<string, string> };
type State = { failSessions: boolean };

async function harness(
  page: Page,
  options: {
    surface: "pdf" | "quiz";
    /** What the n-th Live socket (1-based) does after the client's setup message. */
    live: (n: number) => Live;
    /** Override the n-th request for a token (1-based); null = the normal success reply. */
    session?: (n: number, state: State) => Reply | null;
    maxSessionSeconds?: number;
  },
) {
  const sockets: WebSocketRoute[] = [];
  const inbox: any[][] = [];
  const closedByPage: boolean[] = [];
  const events: any[] = [];
  const state: State = { failSessions: false };
  let sessionCalls = 0;

  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const audio = new AudioContext();
        const destination = audio.createMediaStreamDestination();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        gain.gain.value = 0;
        oscillator.connect(gain).connect(destination);
        oscillator.start();
        return destination.stream;
      },
    });
  });

  await page.route("**/api/student/**", async (route) => {
    const request = route.request();
    const url = request.url();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.includes("/file")) return route.fulfill({ body: studyPdf(), contentType: "application/pdf", headers: cors });
    if (url.endsWith("/session-events")) {
      events.push(request.postDataJSON());
      return route.fulfill({ status: 204, headers: cors });
    }
    if (url.endsWith("/pdf-sessions") || url.endsWith("/sessions")) {
      const n = ++sessionCalls;
      const override = options.session?.(n, state);
      if (override) {
        return route.fulfill({ status: override.status, json: override.body, headers: { ...cors, ...override.headers } });
      }
      const common = {
        token: "auth_tokens/test",
        model: "gemini-3.8-live",
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
        maxSessionSeconds: options.maxSessionSeconds ?? 600,
      };
      return route.fulfill({
        headers: cors,
        json: options.surface === "pdf"
          ? { ...common, resourceId: request.postDataJSON().resourceId }
          : { ...common, conversationId: "conversation-a", messages: [], mode: "hint", questionId: "question-a" },
      });
    }
    return route.fulfill({ headers: cors, json: {} });
  });

  await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws) => {
    const n = sockets.length + 1;
    sockets.push(ws);
    const received: any[] = [];
    inbox.push(received);
    ws.onClose(() => {
      closedByPage[n - 1] = true;
    });
    ws.onMessage((raw) => {
      const data = JSON.parse(raw.toString());
      received.push(data);
      if (!data.setup) return;
      if (options.live(n) === "ready") ws.send(JSON.stringify({ setupComplete: {} }));
      else setTimeout(() => ws.close({ code: 1011, reason: QUOTA }), 300);
    });
  });

  return { sockets, inbox, closedByPage, events, state, sessionCalls: () => sessionCalls };
}

/** Moves the page clock forward in small steps until `done()`; real time passes between steps so network work settles. */
async function advanceUntil(page: Page, done: () => boolean | Promise<boolean>, maxMs = 150_000, step = 1_000) {
  for (let spent = 0; spent < maxMs; spent += step) {
    if (await done()) return;
    await page.clock.runFor(step);
    await page.waitForTimeout(20);
  }
  if (!(await done())) throw new Error(`condition not reached after advancing the clock by ${maxMs} ms`);
}

/** Moves the page clock forward by `ms` in steps, letting network work settle in between. */
async function advance(page: Page, ms: number, step = 4_000) {
  for (let spent = 0; spent < ms; spent += step) {
    await page.clock.runFor(Math.min(step, ms - spent));
    await page.waitForTimeout(20);
  }
}

const sentText = (messages: any[], text: string) => messages.some((message) => message.realtimeInput?.text === text);

test.describe("PDF tutor", () => {
  test("a refused session is retried on its own and the student is told why", async ({ page }) => {
    await page.clock.install();
    const h = await harness(page, { surface: "pdf", live: (n) => (n === 1 ? "quota" : "ready") });
    await page.goto("/tests/fixtures/pdf-study.html");
    const start = page.getByRole("button", { name: "Mulai percakapan" });
    await expect(start).toBeEnabled();
    await start.click();

    const notice = page.getByTestId("tutor-notice");
    await expect(notice).toContainText("Tutor sedang ramai dipakai");
    await expect(notice).toContainText("Mencoba lagi dalam");
    await expect(page.getByRole("button", { name: "Menyambungkan…" })).toBeDisabled();
    // Nothing alarming: this is waiting, not failure.
    await expect(page.getByText("Tutor mengalami kendala")).toHaveCount(0);

    await advanceUntil(page, () => h.sockets.length === 2);
    await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toBeVisible();
    await expect(notice).toHaveCount(0);
    expect(h.sessionCalls()).toBe(2);

    await expect.poll(() => h.events.length).toBeGreaterThanOrEqual(2);
    expect(h.events).toContainEqual(expect.objectContaining({
      surface: "pdf", event: "connect_failed", phase: "connect", kind: "quota", code: 1011,
    }));
    expect(h.events).toContainEqual(expect.objectContaining({ event: "retry_scheduled", kind: "quota", attempt: 1 }));
  });

  test("after the retries run out the student gets a clear message and a fresh start on request", async ({ page }) => {
    await page.clock.install();
    const h = await harness(page, { surface: "pdf", live: () => "quota" });
    await page.goto("/tests/fixtures/pdf-study.html");
    await expect(page.getByRole("button", { name: "Mulai percakapan" })).toBeEnabled();
    await page.getByRole("button", { name: "Mulai percakapan" }).click();

    const error = page.getByText("Silakan coba lagi sebentar lagi.");
    await advanceUntil(page, async () => (await error.count()) > 0, 300_000);
    // The first attempt plus three retries, no more.
    expect(h.sockets).toHaveLength(4);
    await expect(page.getByText("Tutor sedang ramai dipakai")).toBeVisible();
    await expect(page.getByTestId("tutor-notice")).toHaveCount(0);

    await page.getByRole("button", { name: "Coba sambungkan lagi" }).click();
    await expect(page.getByTestId("tutor-notice")).toContainText("Mencoba lagi dalam");
    await advanceUntil(page, () => h.sockets.length === 5);
  });

  test("when the API asks the student to wait, the countdown follows its answer and no Live socket is opened meanwhile", async ({ page }) => {
    await page.clock.install();
    const h = await harness(page, {
      surface: "pdf",
      live: () => "ready",
      session: (n) => n === 1
        ? {
            status: 429,
            headers: { "retry-after": "20" },
            body: { error: "Terlalu banyak sesi AI Tutor dalam waktu singkat. Coba lagi beberapa menit lagi.", code: "AI_TUTOR_RATE_LIMITED", retryAfterSeconds: 20 },
          }
        : null,
    });
    await page.goto("/tests/fixtures/pdf-study.html");
    await expect(page.getByRole("button", { name: "Mulai percakapan" })).toBeEnabled();
    await page.getByRole("button", { name: "Mulai percakapan" }).click();

    const notice = page.getByTestId("tutor-notice");
    await expect(notice).toContainText("Terlalu banyak sesi AI Tutor dalam waktu singkat.");
    await expect(notice).toContainText("Mencoba lagi dalam");
    expect(h.sockets).toHaveLength(0);

    await advanceUntil(page, () => h.sockets.length === 1);
    await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toBeVisible();
    expect(h.sessionCalls()).toBe(2);
  });

  test("a session is handed over to a fresh one before Google's 10-minute cut-off, without a break", async ({ page }) => {
    await page.clock.install();
    // The server reports a short cap here so the whole hand-over fits in a test: renewal starts at 75 s.
    const h = await harness(page, { surface: "pdf", live: () => "ready", maxSessionSeconds: 120 });
    await page.goto("/tests/fixtures/pdf-study.html");
    await expect(page.getByRole("button", { name: "Mulai percakapan" })).toBeEnabled();
    await page.getByRole("button", { name: "Mulai percakapan" }).click();
    await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toBeVisible();
    await expect.poll(() => h.inbox[0]!.some((m) => m.realtimeInput?.audio)).toBe(true);

    await advanceUntil(page, () => h.sockets.length === 2 && h.closedByPage[0] === true, 120_000, 500);

    // Still connected, nothing to read, and the new session knows the page and hears the microphone.
    await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toBeVisible();
    await expect(page.getByText("Tutor mengalami kendala")).toHaveCount(0);
    await expect(page.getByTestId("tutor-notice")).toHaveCount(0);
    expect(h.inbox[1]!.some((m) => m.clientContent?.turns?.[0]?.parts?.[0]?.text?.startsWith("PDF_VIEW_STATE "))).toBe(true);
    await expect.poll(() => h.inbox[1]!.some((m) => m.realtimeInput?.audio)).toBe(true);
    await expect.poll(() => h.events.some((event) => event.event === "renewed")).toBe(true);
  });

  test("if the hand-over keeps failing, the cut-off is met with an automatic reconnect and an explanation", async ({ page }) => {
    await page.clock.install();
    const h = await harness(page, {
      surface: "pdf",
      live: () => "ready",
      session: (_n, state) => state.failSessions
        ? { status: 503, body: { error: "Tutor suara belum dapat disambungkan. Silakan coba lagi.", code: "AI_TUTOR_SESSION_FAILED" } }
        : null,
    });
    await page.goto("/tests/fixtures/pdf-study.html");
    await expect(page.getByRole("button", { name: "Mulai percakapan" })).toBeEnabled();
    await page.getByRole("button", { name: "Mulai percakapan" }).click();
    await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toBeVisible();

    h.state.failSessions = true;
    // The voice orb redraws every animation frame; ten fake minutes would run ~36,000 of them.
    await page.evaluate(() => {
      window.requestAnimationFrame = () => 0;
    });
    await advance(page, 600_000);
    expect(h.sockets).toHaveLength(1);
    await expect.poll(() => h.events.filter((event) => event.event === "renew_failed").length).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toBeVisible();

    // Google cuts the connection at 10 minutes; the API works again by then.
    h.state.failSessions = false;
    await h.sockets[0]!.close({ code: 1011, reason: CUT });
    await advanceUntil(page, () => h.sockets.length === 2, 30_000, 500);
    await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toBeVisible();
    expect(h.events).toContainEqual(expect.objectContaining({ event: "closed", phase: "live", kind: "session_limit", code: 1011 }));
    expect(h.events).toContainEqual(expect.objectContaining({ event: "retry_scheduled", kind: "session_limit" }));
  });
});

test.describe("Quiz and assignment tutor", () => {
  async function open(page: Page) {
    await page.goto("/tests/fixtures/assessment-tutor.html");
    await page.getByRole("button", { name: "Connect", exact: true }).click();
  }

  test("a question typed while the tutor is unreachable is kept and sent once it is back", async ({ page }) => {
    await page.clock.install();
    const h = await harness(page, { surface: "quiz", live: (n) => (n === 1 ? "quota" : "ready") });
    await open(page);
    await expect(page.getByTestId("notice")).toContainText("Mencoba lagi dalam");

    await page.getByRole("button", { name: "Send question" }).click();
    expect(h.sockets).toHaveLength(1);
    expect(sentText(h.inbox[0]!, QUESTION)).toBe(false);

    await advanceUntil(page, () => h.sockets.length === 2 && sentText(h.inbox[1]!, QUESTION));
    await expect(page.getByTestId("notice")).toBeEmpty();
    await expect(page.getByTestId("error")).toBeEmpty();
    expect(h.events).toContainEqual(expect.objectContaining({ surface: "quiz", event: "connect_failed", kind: "quota" }));
  });

  test("a connection that drops while a question is unanswered reconnects and asks it again", async ({ page }) => {
    await page.clock.install();
    const h = await harness(page, { surface: "quiz", live: () => "ready" });
    await open(page);
    await expect(page.getByTestId("status")).toHaveText("ready");
    await page.getByRole("button", { name: "Send question" }).click();
    await expect.poll(() => sentText(h.inbox[0]!, QUESTION)).toBe(true);

    await h.sockets[0]!.close({ code: 1011, reason: CUT });
    await advanceUntil(page, () => h.sockets.length === 2 && sentText(h.inbox[1]!, QUESTION), 60_000, 500);
    expect(h.events).toContainEqual(expect.objectContaining({ surface: "quiz", event: "closed", kind: "unavailable" }));
  });

  test("when it cannot be fixed the student sees why instead of a silent idle", async ({ page }) => {
    await page.clock.install();
    const h = await harness(page, { surface: "quiz", live: () => "quota" });
    await open(page);

    const error = page.getByTestId("error");
    await advanceUntil(page, async () => (await error.innerText()).includes("Silakan coba lagi sebentar lagi."), 300_000);
    await expect(error).toContainText("Tutor sedang ramai dipakai");
    await expect(page.getByTestId("status")).toHaveText("error");
    expect(h.sockets).toHaveLength(4);
  });

  test("closing the tutor cancels a pending retry", async ({ page }) => {
    await page.clock.install();
    const h = await harness(page, { surface: "quiz", live: () => "quota" });
    await open(page);
    await expect(page.getByTestId("notice")).toContainText("Mencoba lagi dalam");
    await page.getByRole("button", { name: "Disconnect" }).click();
    await expect(page.getByTestId("notice")).toBeEmpty();
    await page.clock.runFor(120_000);
    await page.waitForTimeout(100);
    expect(h.sockets).toHaveLength(1);
  });
});

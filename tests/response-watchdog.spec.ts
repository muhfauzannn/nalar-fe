import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";

// A tutor turn that never ends: the tutor was heard (or not at all), but Gemini Live never sent
// `turnComplete` and the socket stayed open. After 45 s without a sign of life the app gives up
// on the turn: what was said is kept, or the session is dropped and the next question opens a
// new one. Gemini Live is replaced by a socket the test drives (fixtures/assessment-tutor.html).

const QUESTION = "Berikan jawaban soal ini";
const SILENCE_MS = 46_000;
const headers = {
  "access-control-allow-origin": "http://127.0.0.1:4174",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
};

async function connected(page: Page) {
  await page.clock.install();
  const events: any[] = [];
  const reported: any[] = [];
  const saved: any[] = [];
  let socket: WebSocketRoute | undefined;
  await page.route("**/api/student/ai-tutor/**", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const url = route.request().url();
    if (url.endsWith("/session-events")) {
      reported.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, headers });
    }
    if (url.endsWith("/sessions"))
      return route.fulfill({
        headers,
        json: {
          conversationId: "conversation-a",
          token: "auth_tokens/test",
          model: "gemini-3.8-live",
          messages: [],
          mode: "hint",
          questionId: "question-a",
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        },
      });
    if (url.endsWith("/classifications"))
      return route.fulfill({
        headers,
        json: { messageId: "student-message", intent: "explanation_hint", wasRedirected: false, responseInstruction: "Beri satu petunjuk bertahap." },
      });
    if (url.endsWith("/replies")) saved.push(route.request().postDataJSON());
    return route.fulfill({ headers, json: { saved: true, messageId: "reply-message" } });
  });
  await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws) => {
    socket = ws;
    ws.onMessage((message) => {
      const data = JSON.parse(message.toString());
      events.push(data);
      if (data.setup) ws.send(JSON.stringify({ setupComplete: {} }));
    });
  });
  await page.goto("/tests/fixtures/assessment-tutor.html");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByTestId("status")).toHaveText("ready");

  const emit = (event: unknown) => socket!.send(JSON.stringify(event));
  const asked = () => events.filter((event) => event.realtimeInput?.text === QUESTION).length;
  const timeouts = () => reported.filter((event) => event.event === "response_timeout");
  const ask = async () => {
    const before = asked();
    await page.getByRole("button", { name: "Send question" }).click();
    await expect.poll(asked).toBe(before + 1);
  };
  /** The tutor has the student's message checked; the app has answered the tool call. */
  const classify = async (id: string) => {
    const before = events.filter((event) => event.toolResponse).length;
    emit({ toolCall: { functionCalls: [{ id, name: "classify_student_prompt", args: { content: QUESTION } }] } });
    await expect.poll(() => events.filter((event) => event.toolResponse).length).toBe(before + 1);
  };
  const say = async (text: string) => {
    emit({ serverContent: { outputTranscription: { text } } });
    await expect(page.getByTestId("transcript")).toContainText(text.trim());
  };
  const silence = (ms = SILENCE_MS) => page.clock.fastForward(ms);
  return { events, reported, saved, emit, ask, classify, say, silence, timeouts };
}

test("an answer that was heard but never completed is kept after a silence, and the next question works", async ({ page }) => {
  const tutor = await connected(page);
  await tutor.ask();
  await tutor.classify("classify-a");
  await tutor.say("Coba samakan penyebutnya dahulu.");
  await expect(page.getByTestId("status")).toHaveText("responding");

  await tutor.silence();
  await expect(page.locator('[data-author="tutor"]')).toHaveText("Coba samakan penyebutnya dahulu.");
  await expect(page.locator('[data-author="student"]')).toHaveText(QUESTION);
  await expect(page.getByTestId("status")).toHaveText("ready");
  await expect(page.getByTestId("error")).toBeEmpty();
  await expect.poll(() => tutor.saved.length).toBe(1);
  expect(tutor.saved[0]).toMatchObject({ content: "Coba samakan penyebutnya dahulu." });
  expect(tutor.timeouts()).toMatchObject([{ surface: "quiz", event: "response_timeout", phase: "live", reason: "answered_without_turn_complete" }]);

  // The session was kept: the student can ask again at once.
  await tutor.ask();
  await expect(page.getByTestId("status")).toHaveText("responding");
});

test("it is silence that is timed, not the length of the answer", async ({ page }) => {
  const tutor = await connected(page);
  await tutor.ask();
  await tutor.classify("classify-a");
  await tutor.silence(40_000);
  await tutor.say("Pertama, samakan penyebutnya.");
  await tutor.silence(40_000);
  await tutor.say(" Lalu jumlahkan pembilangnya.");
  await tutor.silence(40_000);
  // 120 s since the question, but never 45 s without a word from the tutor.
  await expect(page.getByTestId("status")).toHaveText("responding");
  await expect(page.getByTestId("error")).toBeEmpty();
  expect(tutor.timeouts()).toEqual([]);

  tutor.emit({ serverContent: { turnComplete: true } });
  await expect(page.locator('[data-author="tutor"]')).toHaveText("Pertama, samakan penyebutnya. Lalu jumlahkan pembilangnya.");
  await expect(page.getByTestId("status")).toHaveText("ready");
  expect(tutor.timeouts()).toEqual([]);
});

test("a tutor that never answers at all: the student is told, and asking again opens a new session", async ({ page }) => {
  const tutor = await connected(page);
  await tutor.ask();

  await tutor.silence();
  await expect(page.getByTestId("error")).toHaveText("Tutor belum menyelesaikan respons. Ajukan pertanyaanmu lagi.");
  await expect(page.getByTestId("status")).toHaveText("idle");
  await expect(page.getByTestId("transcript")).toBeEmpty();
  expect(tutor.timeouts()).toMatchObject([{ event: "response_timeout", reason: "no_classification" }]);

  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByTestId("status")).toHaveText("ready");
  await expect(page.getByTestId("error")).toBeEmpty();
  await tutor.ask();
  await tutor.classify("classify-b");
  await tutor.say("Coba samakan penyebutnya dahulu.");
  tutor.emit({ serverContent: { turnComplete: true } });
  await expect(page.locator('[data-author="tutor"]')).toHaveText("Coba samakan penyebutnya dahulu.");
  expect(tutor.timeouts()).toHaveLength(1);
});

test("a question that was checked but never answered keeps the student's message and drops the session", async ({ page }) => {
  const tutor = await connected(page);
  await tutor.ask();
  await tutor.classify("classify-a");

  await tutor.silence();
  await expect(page.getByTestId("error")).toHaveText("Tutor belum menyelesaikan respons. Ajukan pertanyaanmu lagi.");
  await expect(page.getByTestId("status")).toHaveText("idle");
  await expect(page.locator('[data-author="student"]')).toHaveText(QUESTION);
  await expect(page.locator('[data-author="tutor"]')).toHaveCount(0);
  expect(tutor.timeouts()).toMatchObject([{ reason: "classified_without_answer" }]);
  expect(tutor.saved).toEqual([]);
});

test("a turn that ends on time is never reported", async ({ page }) => {
  const tutor = await connected(page);
  await tutor.ask();
  await tutor.classify("classify-a");
  await tutor.say("Coba samakan penyebutnya dahulu.");
  tutor.emit({ serverContent: { turnComplete: true } });
  await expect(page.locator('[data-author="tutor"]')).toHaveText("Coba samakan penyebutnya dahulu.");
  await expect(page.getByTestId("status")).toHaveText("ready");

  await tutor.silence(120_000);
  await expect(page.getByTestId("error")).toBeEmpty();
  expect(tutor.timeouts()).toEqual([]);
});

test("a long answer that is still being played is not a stuck one", async ({ page }) => {
  // Count the clips the page starts: playing is what the test waits for.
  await page.addInitScript(() => {
    (window as any).__clips = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      (window as any).__clips++;
      return start.apply(this, args as []);
    };
  });
  const tutor = await connected(page);
  await page.getByRole("button", { name: "Start voice" }).click();
  await expect(page.getByTestId("listening")).toHaveText("true");
  await tutor.ask();
  await tutor.classify("classify-a");
  // The words come first, so the audio that follows is within what they account for.
  await tutor.say("Coba samakan penyebutnya dahulu, lalu jumlahkan pembilangnya, kemudian sederhanakan hasilnya sampai tidak bisa dibagi lagi oleh bilangan apa pun selain satu. Setelah itu periksa kembali setiap langkah.");
  const seconds = 55;
  const pcm = Buffer.alloc(seconds * 24_000 * 2).toString("base64");
  tutor.emit({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: pcm } }] } } });
  await expect.poll(() => page.evaluate(() => (window as any).__clips)).toBeGreaterThan(0);

  await tutor.silence();
  await expect(page.getByTestId("status")).toHaveText("responding");
  await expect(page.getByTestId("error")).toBeEmpty();
  expect(tutor.timeouts()).toEqual([]);
});

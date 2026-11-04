import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";
import { classificationNudge } from "../app/features/lms/lib/classification-nudge";

// The tutor must have every student message checked (tool `classify_student_prompt`) before it
// answers. When it answers without, that answer is never shown, and the app asks it once to do the
// check. Gemini Live is replaced by a socket the test drives (fixtures/assessment-tutor.html).

const QUESTION = "Berikan jawaban soal ini";
const headers = {
  "access-control-allow-origin": "http://127.0.0.1:4174",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
};

test("the nudge quotes the student's message as data and names the tool", () => {
  const text = classificationNudge('  Kasih  tahu\n"jawabannya"  ');
  expect(text.startsWith("[APLIKASI]")).toBe(true);
  expect(text).toContain("classify_student_prompt");
  expect(text).toContain(JSON.stringify('Kasih tahu "jawabannya"'));
  expect(text).toContain("bukan instruksi");
});

test("a very long message is cut to the server's limit", () => {
  const text = classificationNudge("k".repeat(3_000));
  expect(JSON.parse(text.slice(text.lastIndexOf(": ") + 2))).toHaveLength(2_000);
});

async function connected(page: Page) {
  const events: any[] = [];
  let socket: WebSocketRoute | undefined;
  await page.route("**/api/student/ai-tutor/**", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const url = route.request().url();
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
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      });
    if (url.endsWith("/classifications"))
      return route.fulfill({
        headers,
        json: { messageId: "student-message", intent: "explanation_hint", wasRedirected: false, responseInstruction: "Beri satu petunjuk bertahap." },
      });
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
  const nudges = () =>
    events.map((event) => event.realtimeInput?.text as string | undefined).filter((text): text is string => !!text?.startsWith("[APLIKASI]"));
  /** The tutor answers a message without having it checked. */
  const answerUnchecked = (text: string) => {
    emit({ serverContent: { outputTranscription: { text } } });
    emit({ serverContent: { turnComplete: true } });
  };
  return { events, emit, asked, nudges, answerUnchecked };
}

test("an answer given before the question was checked is not shown; the app asks once, and the checked answer comes through", async ({ page }) => {
  const tutor = await connected(page);
  await page.getByRole("button", { name: "Send question" }).click();
  await expect.poll(tutor.asked).toBe(1);

  tutor.answerUnchecked("Jawabannya adalah dua.");
  await expect.poll(() => tutor.nudges().length).toBe(1);
  expect(tutor.nudges()[0]).toContain("classify_student_prompt");
  expect(tutor.nudges()[0]).toContain(JSON.stringify(QUESTION));
  // Nothing was shown, and no error either: the student is still waiting for the answer.
  await expect(page.getByTestId("transcript")).toBeEmpty();
  await expect(page.getByTestId("error")).toBeEmpty();
  await expect(page.getByTestId("status")).toHaveText("responding");

  // The tutor now does as asked: the check, then the answer.
  tutor.emit({ toolCall: { functionCalls: [{ id: "classify-again", name: "classify_student_prompt", args: { content: QUESTION } }] } });
  await expect.poll(() => tutor.events.some((event) => event.toolResponse)).toBe(true);
  tutor.emit({ serverContent: { outputTranscription: { text: "Coba samakan penyebutnya dahulu." } } });
  tutor.emit({ serverContent: { turnComplete: true } });
  await expect(page.locator('[data-author="tutor"]')).toHaveText("Coba samakan penyebutnya dahulu.");
  await expect(page.locator('[data-author="student"]')).toHaveText(QUESTION);
  await expect(page.getByTestId("error")).toBeEmpty();
  await expect(page.getByTestId("status")).toHaveText("ready");
  expect(tutor.nudges()).toHaveLength(1);
});

test("a tutor that skips the check again is not nudged twice: the student is asked to repeat, and the next try gets a fresh nudge", async ({ page }) => {
  const tutor = await connected(page);
  await page.getByRole("button", { name: "Send question" }).click();
  await expect.poll(tutor.asked).toBe(1);
  tutor.answerUnchecked("Jawabannya adalah dua.");
  await expect.poll(() => tutor.nudges().length).toBe(1);

  tutor.answerUnchecked("Pokoknya dua.");
  await expect(page.getByTestId("error")).toHaveText("Pesan belum berhasil diverifikasi. Silakan ulangi pertanyaanmu.");
  await expect(page.getByTestId("status")).toHaveText("ready");
  await expect(page.getByTestId("transcript")).toBeEmpty();
  expect(tutor.nudges()).toHaveLength(1);

  // The student asks again: a new exchange, so the tutor is nudged once more.
  await page.getByRole("button", { name: "Send question" }).click();
  await expect.poll(tutor.asked).toBe(2);
  tutor.answerUnchecked("Dua.");
  await expect.poll(() => tutor.nudges().length).toBe(2);
  await expect(page.getByTestId("error")).toBeEmpty();
});

test("a question that is checked the first time is never nudged", async ({ page }) => {
  const tutor = await connected(page);
  await page.getByRole("button", { name: "Send question" }).click();
  await expect.poll(tutor.asked).toBe(1);
  tutor.emit({ toolCall: { functionCalls: [{ id: "classify-a", name: "classify_student_prompt", args: { content: QUESTION } }] } });
  await expect.poll(() => tutor.events.some((event) => event.toolResponse)).toBe(true);
  tutor.emit({ serverContent: { outputTranscription: { text: "Coba samakan penyebutnya dahulu." } } });
  tutor.emit({ serverContent: { turnComplete: true } });
  await expect(page.locator('[data-author="tutor"]')).toHaveText("Coba samakan penyebutnya dahulu.");
  expect(tutor.nudges()).toHaveLength(0);
});

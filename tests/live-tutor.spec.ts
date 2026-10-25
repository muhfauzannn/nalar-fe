import { test, expect, type WebSocketRoute } from "@playwright/test";

test("Gemini client opens the constrained session with the minted token and passes server messages through", async ({ page }) => {
  let socket: WebSocketRoute | undefined;
  let url = "";
  const sent: any[] = [];
  await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws) => {
    socket = ws;
    url = ws.url();
    ws.onMessage((message) => {
      const data = JSON.parse(message.toString());
      sent.push(data);
      if (data.setup) ws.send(JSON.stringify({ setupComplete: {} }));
    });
  });
  await page.goto("/tests/fixtures/pdf-study.html");
  await page.evaluate(async () => {
    const modulePath = "/app/features/lms/lib/live-tutor-client.ts";
    const { connectTutorLive } = await import(modulePath);
    const state = window as any;
    state.tutorEvents = [];
    state.tutor = await connectTutorLive("auth_tokens/test", "gemini-3.8-live", {
      onmessage: (event: unknown) => state.tutorEvents.push(event),
    });
    state.tutor.sendClientContent({ turns: [{ role: "user", parts: [{ text: "PDF_VIEW_STATE {}" }] }], turnComplete: false });
  });
  expect(url).toContain("BidiGenerateContentConstrained");
  expect(url).toContain("access_token=auth_tokens/test");
  expect(sent[0].setup.model).toBe("models/gemini-3.8-live");
  await expect.poll(() => sent.some((event) => event.clientContent?.turnComplete === false)).toBe(true);
  socket!.send(JSON.stringify({ toolCall: { functionCalls: [{ id: "first", name: "get_pdf_context", args: {} }] } }));
  await expect.poll(() => page.evaluate(() => (window as any).tutorEvents.some((event: any) => event.toolCall))).toBe(true);
  await page.evaluate(() => (window as any).tutor.sendToolResponse({ functionResponses: [{ id: "first", name: "get_pdf_context", response: { ok: true } }] }));
  await expect.poll(() => sent.find((event) => event.toolResponse)?.toolResponse.functionResponses[0].id).toBe("first");
  await page.evaluate(() => (window as any).tutor.close());
});

test("assessment tutor verifies the student prompt before showing or saving its reply", async ({ page }) => {
  let socket: WebSocketRoute | undefined;
  const events: any[] = [];
  let classified: any;
  let saved: any;
  const headers = { "access-control-allow-origin": "http://127.0.0.1:4174", "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type" };
  await page.route("**/api/student/ai-tutor/**", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const url = route.request().url();
    if (url.endsWith("/sessions")) return route.fulfill({ headers, json: {
      conversationId: "conversation-a", token: "auth_tokens/test", model: "gemini-3.8-live", messages: [], mode: "hint", questionId: "question-a",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    } });
    if (url.endsWith("/classifications")) {
      classified = route.request().postDataJSON();
      return route.fulfill({ headers, json: { messageId: "student-message", intent: "direct_answer", wasRedirected: true, responseInstruction: "Jangan beri jawaban akhir; berikan petunjuk." } });
    }
    saved = route.request().postDataJSON();
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
  const emit = (event: unknown) => socket!.send(JSON.stringify(event));
  await page.goto("/tests/fixtures/assessment-tutor.html");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByTestId("status")).toHaveText("ready");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect.poll(() => events.some((event) => event.realtimeInput?.text === "Berikan jawaban soal ini")).toBe(true);
  emit({ serverContent: { outputTranscription: { text: "Unverified answer" } } });
  await expect(page.getByTestId("transcript")).toBeEmpty();
  expect(saved).toBeUndefined();
  emit({ toolCall: { functionCalls: [{ id: "classify-a", name: "classify_student_prompt", args: { content: "Berikan jawaban soal ini" } }] } });
  await expect.poll(() => events.some((event) => event.toolResponse)).toBe(true);
  expect(classified.content).toBe("Berikan jawaban soal ini");
  expect(classified.questionId).toBe("question-a");
  const output = events.find((event) => event.toolResponse).toolResponse.functionResponses[0];
  expect(output.id).toBe("classify-a");
  expect(output.response.wasRedirected).toBe(true);
  emit({ serverContent: { outputTranscription: { text: "Coba samakan penyebutnya dahulu." } } });
  emit({ serverContent: { turnComplete: true } });
  await expect(page.locator('[data-author="tutor"]')).toHaveText("Coba samakan penyebutnya dahulu.");
  await expect(page.locator('[data-author="tutor"]')).toHaveAttribute("data-redirected", "true");
  await expect.poll(() => saved?.content).toBe("Coba samakan penyebutnya dahulu.");
  expect(saved.inReplyToEventId).toBe(classified.clientEventId);
  await expect(page.getByTestId("error")).toBeEmpty();
});

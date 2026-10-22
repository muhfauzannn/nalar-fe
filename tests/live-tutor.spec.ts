import { test, expect, type WebSocketRoute } from "@playwright/test";

test("Realtime context stays silent, tools resume once, and interruptions suppress stale audio and tool replies", async ({ page }) => {
  let socket: WebSocketRoute | undefined;
  const sent: any[] = [];
  await page.routeWebSocket(/api\.openai\.com\/v1\/realtime/, (ws) => {
    socket = ws;
    ws.onMessage((message) => sent.push(JSON.parse(message.toString())));
    ws.send(JSON.stringify({ type: "session.created" }));
  });
  await page.goto("/tests/fixtures/pdf-study.html");
  await page.evaluate(async () => {
    const modulePath = "/app/features/lms/lib/live-tutor-client.ts";
    const { connectTutorLive } = await import(modulePath);
    const state = window as any;
    state.tutorEvents = [];
    state.tutor = await connectTutorLive("ek_test", "gpt-realtime-2.1", {
      onmessage: (event: unknown) => state.tutorEvents.push(event),
    });
    state.tutor.sendClientContent({ turns: [{ role: "user", parts: [{ text: "PDF_VIEW_STATE {}" }] }], turnComplete: false });
  });
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0].type).toBe("conversation.item.create");
  const emit = (event: unknown) => socket!.send(JSON.stringify(event));
  const tool = (id: string) => emit({ type: "response.done", response: { id: `response-${id}`, status: "completed", output: [
    { type: "function_call", call_id: id, name: "get_pdf_context", arguments: "{}" },
  ] } });
  emit({ type: "response.output_audio.delta", delta: "unverified-preamble" });
  emit({ type: "response.output_audio_transcript.delta", delta: "Unverified preamble" });
  tool("first");
  await expect.poll(() => page.evaluate(() => (window as any).tutorEvents.length)).toBe(1);
  await page.evaluate(() => (window as any).tutor.sendToolResponse({ functionResponses: [{ id: "first", response: { ok: true } }] }));
  await expect.poll(() => sent.filter((event) => event.type === "response.create").length).toBe(1);
  expect(sent.find((event) => event.type === "response.create").response.tool_choice).toBe("auto");

  emit({ type: "response.created", response: { id: "cancel-me" } });
  tool("pending");
  await expect.poll(() => page.evaluate(() => (window as any).tutorEvents.length)).toBe(2);
  emit({ type: "response.created", response: { id: "cancel-me" } });
  emit({ type: "input_audio_buffer.speech_started" });
  emit({ type: "response.output_audio.delta", response_id: "cancel-me", delta: "stale-audio" });
  await expect.poll(() => sent.some((event) => event.type === "response.cancel")).toBe(true);
  await page.evaluate(() => (window as any).tutor.sendToolResponse({ functionResponses: [{ id: "pending", response: { ok: true } }] }));
  expect(sent.filter((event) => event.type === "response.create")).toHaveLength(1);
  const events = await page.evaluate(() => (window as any).tutorEvents);
  expect(events.some((event: any) => event.toolCallCancellation?.ids.includes("pending"))).toBe(true);
  expect(events.some((event: any) => event.serverContent?.modelTurn)).toBe(false);
  const cancelled = sent.find((event) => event.item?.call_id === "pending");
  expect(JSON.parse(cancelled.item.output).ok).toBe(false);
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
      conversationId: "conversation-a", token: "ek_test", model: "gpt-realtime-2.1", messages: [], mode: "hint", questionId: "question-a",
    } });
    if (url.endsWith("/classifications")) {
      classified = route.request().postDataJSON();
      return route.fulfill({ headers, json: { messageId: "student-message", intent: "direct_answer", wasRedirected: true, responseInstruction: "Jangan beri jawaban akhir; berikan petunjuk." } });
    }
    saved = route.request().postDataJSON();
    return route.fulfill({ headers, json: { saved: true, messageId: "reply-message" } });
  });
  await page.routeWebSocket(/api\.openai\.com\/v1\/realtime/, (ws) => {
    socket = ws;
    ws.onMessage((message) => events.push(JSON.parse(message.toString())));
    ws.send(JSON.stringify({ type: "session.created" }));
  });
  const emit = (event: unknown) => socket!.send(JSON.stringify(event));
  await page.goto("/tests/fixtures/assessment-tutor.html");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByTestId("status")).toHaveText("ready");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect.poll(() => events.some((event) => event.type === "response.create")).toBe(true);
  emit({ type: "response.output_audio_transcript.delta", delta: "Unverified answer" });
  await expect(page.getByTestId("transcript")).toBeEmpty();
  expect(saved).toBeUndefined();
  emit({ type: "response.done", response: { id: "classification", status: "completed", output: [{
    type: "function_call", call_id: "classify-a", name: "classify_student_prompt", arguments: JSON.stringify({ content: "Berikan jawaban soal ini" }),
  }] } });
  await expect.poll(() => events.some((event) => event.item?.type === "function_call_output")).toBe(true);
  expect(classified.content).toBe("Berikan jawaban soal ini");
  expect(classified.questionId).toBe("question-a");
  const output = events.find((event) => event.item?.type === "function_call_output");
  expect(JSON.parse(output.item.output).wasRedirected).toBe(true);
  emit({ type: "response.output_audio_transcript.delta", delta: "Coba samakan penyebutnya dahulu." });
  emit({ type: "response.done", response: { id: "explanation", status: "completed", output: [] } });
  await expect(page.locator('[data-author="tutor"]')).toHaveText("Coba samakan penyebutnya dahulu.");
  await expect(page.locator('[data-author="tutor"]')).toHaveAttribute("data-redirected", "true");
  await expect.poll(() => saved?.content).toBe("Coba samakan penyebutnya dahulu.");
  expect(saved.inReplyToEventId).toBe(classified.clientEventId);
  await expect(page.getByTestId("error")).toBeEmpty();
});

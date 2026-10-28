import { expect, test } from "@playwright/test";
import { InteractionStatus, type Content } from "@google/genai";
import { canPublishPdfContext, pdfOutputText, pdfQuestionContent, pdfResponseEnded } from "../app/features/lms/lib/pdf-tutor-turn";
import type { PdfViewContext } from "../app/features/lms/lib/pdf-tutor";

const view: PdfViewContext = {
  resourceId: "relations", fingerprint: "relations-v1", page: 1, totalPages: 2,
  revision: 3, viewport: { x: 0, y: 0, width: 1, height: 0.8 }, selection: null,
  blocks: [{ id: "p1-b1", text: "Domain dan kodomain", x: 0.1, y: 0.2, width: 0.4, height: 0.04 }],
  image: "source-jpeg", resolveTextRange: () => [],
};
const question = "Jelaskan domain kodomain dan contohnya";
const state = { pendingTool: false, toolContinuation: false, hasOutput: false };

test("the domain question and full evidence are delivered as one ordered, complete user turn", () => {
  const request = pdfQuestionContent(view, "turn-1", question, true);
  const turns = request.turns as Content[];
  expect(request.turnComplete).toBe(true);
  expect(turns).toHaveLength(1);
  expect(turns[0].role).toBe("user");
  const parts = turns[0].parts!;
  const context = JSON.parse(parts[0].text!.slice("PDF_CONTEXT ".length));
  expect(context).toMatchObject({ resourceId: "relations", revision: 3, turnId: "turn-1", blocks: view.blocks });
  expect(context).not.toHaveProperty("resolveTextRange");
  expect(parts[1].inlineData).toEqual({ data: "source-jpeg", mimeType: "image/jpeg" });
  expect(parts.at(-1)?.text).toBe(question);
});

test("cached images can be omitted without omitting the latest text or selection", () => {
  const request = pdfQuestionContent({ ...view, revision: 4, selection: { ...view.blocks[0] } }, "turn-2", question, false);
  const parts = (request.turns as Content[])[0].parts!;
  expect(parts).toHaveLength(2);
  expect(JSON.parse(parts[0].text!.slice(12))).toMatchObject({ revision: 4, selection: { text: "Domain dan kodomain" } });
});

test("a silent scroll update cannot pause generation between a typed question and its first answer", () => {
  const wire = [pdfQuestionContent(view, "turn-1", question, true)];
  if (canPublishPdfContext(true, false)) wire.push({ turns: [], turnComplete: false });
  expect(wire).toHaveLength(1);
  expect(wire.at(-1)?.turnComplete).toBe(true);
  expect(canPublishPdfContext(false, true)).toBe(false);
  expect(canPublishPdfContext(false, false)).toBe(true);
});

test("a tool boundary stays busy while the next answer is being generated", () => {
  expect(pdfResponseEnded({ turnComplete: true }, { ...state, toolContinuation: true })).toBe(false);
  expect(pdfResponseEnded({ turnComplete: true, interactionStatus: InteractionStatus.IN_PROGRESS }, { ...state, hasOutput: true })).toBe(false);
});

test("explicit idle after a tool does not leave the watchdog waiting forever", () => {
  expect(pdfResponseEnded({ turnComplete: true, interactionStatus: InteractionStatus.IDLE }, { ...state, toolContinuation: true })).toBe(true);
});

test("generationComplete ends an answered turn without waiting for a delayed audio tail", () => {
  expect(pdfResponseEnded({ generationComplete: true }, { ...state, hasOutput: true })).toBe(true);
  expect(pdfResponseEnded({ generationComplete: true }, state)).toBe(false);
});

test("an idle frame cannot complete a visual tool that has not finished rendering", () => {
  expect(pdfResponseEnded({ turnComplete: true, interactionStatus: InteractionStatus.IDLE }, { ...state, pendingTool: true })).toBe(false);
});

test("a response in modelTurn.text is visible even without outputTranscription", () => {
  expect(pdfOutputText({ modelTurn: { parts: [{ text: "Domain adalah daerah asal. " }, { text: "Kodomain adalah daerah kawan." }] } })).toBe("Domain adalah daerah asal. Kodomain adalah daerah kawan.");
  expect(pdfOutputText({ modelTurn: { parts: [{ text: "internal reasoning", thought: true }] } })).toBe("");
  expect(pdfOutputText({ outputTranscription: { text: "Transkrip" }, modelTurn: { parts: [{ text: "Teks alternatif" }] } })).toBe("Transkrip");
});

test("recovery carries the same question and turn, fresh evidence, and a bounded visual fallback", () => {
  const request = pdfQuestionContent({ ...view, revision: 5 }, "turn-1", question, true, true);
  const parts = (request.turns as Content[])[0].parts!;
  expect(JSON.parse(parts[0].text!.slice(12))).toMatchObject({ revision: 5, turnId: "turn-1", explainWithoutVisuals: true });
  expect(parts.at(-1)?.text).toBe(question);
});

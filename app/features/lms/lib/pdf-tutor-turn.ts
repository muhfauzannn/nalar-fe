import type { LiveSendClientContentParameters, LiveServerContent } from "@google/genai";
import { contextForModel, type PdfViewContext } from "./pdf-tutor";

/** Keep evidence and the typed question in one ordered turn, rather than mixing
 * realtime video, an unfinished context turn, and a separate question. */
export function pdfQuestionContent(
  view: PdfViewContext,
  turnId: string,
  question: string,
  includeImage: boolean,
  explainWithoutVisuals = false,
): LiveSendClientContentParameters {
  return {
    turns: [{ role: "user", parts: [
      { text: `PDF_CONTEXT ${JSON.stringify({ ...contextForModel(view, turnId), explainWithoutVisuals })}` },
      ...(includeImage && view.image ? [{ inlineData: { data: view.image, mimeType: "image/jpeg" } }] : []),
      { text: question },
    ] }],
    turnComplete: true,
  };
}

/** Silent clientContent can leave the provider waiting for another user turn.
 * During a response, view changes stay local until get_pdf_context is called. */
export function canPublishPdfContext(responding: boolean, playing: boolean) {
  return !responding && !playing;
}

export function pdfOutputText(server: LiveServerContent | undefined) {
  return server?.outputTranscription?.text ||
    server?.modelTurn?.parts?.filter((part) => !part.thought).map((part) => part.text ?? "").join("") || "";
}

/** Tool boundaries and background work are not completion. An explicit idle
 * state or completed answer is; don't wait forever for an audio playback tail. */
export function pdfResponseEnded(
  server: LiveServerContent | undefined,
  state: { pendingTool: boolean; toolContinuation: boolean; hasOutput: boolean },
) {
  if (!server || state.pendingTool || server.interactionStatus === "IN_PROGRESS") return false;
  if (server.interactionStatus === "IDLE" && server.turnComplete) return true;
  if (server.generationComplete && state.hasOutput) return true;
  return !!server.turnComplete && !state.toolContinuation;
}

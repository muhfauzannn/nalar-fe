import type { PdfTutorStatus } from "../hooks/use-pdf-tutor";
import type { VoiceState } from "../components/tutor-conversation";
import type { LessonData } from "../types";
import type { SpiritMood } from "./spirit-store";

/** The PDF the board shows, and so the one the tutor spirit reads: the lesson's first file. */
export function boardPdf(lesson: Pick<LessonData, "resources"> | null) {
  return lesson?.resources.find((resource) => resource.file) ?? null;
}

/** How the spirit acts out what the PDF tutor is doing. */
export function spiritMoodFor(status: PdfTutorStatus): SpiritMood {
  if (status === "speaking") return "speaking";
  if (status === "thinking" || status === "connecting") return "thinking";
  if (status === "listening") return "listening";
  return "idle";
}

export function voiceStateFor(status: PdfTutorStatus): VoiceState {
  if (status === "connecting" || status === "speaking" || status === "thinking" || status === "listening") {
    return status;
  }
  return "muted";
}

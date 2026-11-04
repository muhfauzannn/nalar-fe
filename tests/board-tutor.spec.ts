import { expect, test } from "@playwright/test";
import { boardPdf, spiritMoodFor, voiceStateFor } from "../app/features/lms/world3d/board-tutor";

const resource = (id: string, type: "text" | "link" | "file", file: boolean) => ({
  id,
  type,
  title: id,
  content: null,
  url: null,
  file: file ? { name: `${id}.pdf`, size: 800 } : null,
  position: 1,
});

test("the board reads the lesson's first PDF, and nothing when there is none", () => {
  expect(boardPdf(null)).toBeNull();
  expect(boardPdf({ resources: [] })).toBeNull();
  expect(boardPdf({ resources: [resource("tautan", "link", false), resource("teks", "text", false)] })).toBeNull();
  expect(
    boardPdf({ resources: [resource("tautan", "link", false), resource("a", "file", true), resource("b", "file", true)] })?.id,
  ).toBe("a");
});

test("the spirit acts out what the PDF tutor is doing", () => {
  expect(spiritMoodFor("speaking")).toBe("speaking");
  expect(spiritMoodFor("thinking")).toBe("thinking");
  expect(spiritMoodFor("connecting")).toBe("thinking");
  expect(spiritMoodFor("listening")).toBe("listening");
  for (const idle of ["idle", "paused", "error"] as const) expect(spiritMoodFor(idle)).toBe("idle");
});

test("the voice bar shows a live state only while the tutor is actually doing something", () => {
  for (const live of ["connecting", "speaking", "thinking", "listening"] as const) expect(voiceStateFor(live)).toBe(live);
  for (const quiet of ["idle", "paused", "error"] as const) expect(voiceStateFor(quiet)).toBe("muted");
});

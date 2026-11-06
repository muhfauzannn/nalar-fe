import { expect, test } from "@playwright/test";
import { wrapLines } from "../app/features/lms/world3d/station-paint";

// The text layout the stations' faces use: lines that fit, a last line that says it was cut.
// A stand-in canvas context where every letter is 10px wide.
const ctx = { measureText: (text: string) => ({ width: text.length * 10 }) } as unknown as CanvasRenderingContext2D;

test("text that fits stays on one line", () => {
  expect(wrapLines(ctx, "Latihan osmosis", 300, 3)).toEqual(["Latihan osmosis"]);
});

test("text wraps at word boundaries within the width", () => {
  expect(wrapLines(ctx, "Latihan osmosis dan transpor membran", 160, 4)).toEqual(["Latihan osmosis", "dan transpor", "membran"]);
});

test("when the lines run out the last one ends with an ellipsis, on a whole word", () => {
  const lines = wrapLines(ctx, "Rancang percobaan untuk menguji pengaruh konsentrasi larutan", 160, 3);
  expect(lines).toHaveLength(3);
  expect(lines[2]!.endsWith("…")).toBe(true);
  // no word is cut in two: what is left of the last line is whole words of the title
  const words = "Rancang percobaan untuk menguji pengaruh konsentrasi larutan".split(" ");
  for (const word of lines[2]!.slice(0, -1).trim().split(" ")) expect(words).toContain(word);
  for (const line of lines) expect(line.length * 10).toBeLessThanOrEqual(160);
});

test("a single word wider than the line is cut by letters, never overflowing", () => {
  const [line] = wrapLines(ctx, "Elektrokardiografi", 90, 1);
  expect(line!.endsWith("…")).toBe(true);
  expect(line!.length * 10).toBeLessThanOrEqual(90);
});

test("no text, no lines", () => {
  expect(wrapLines(ctx, "   ", 200, 3)).toEqual([]);
});

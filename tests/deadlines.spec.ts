import { expect, test } from "@playwright/test";
import { createServer } from "vite";

import type { UpcomingWork } from "../app/features/lms/types";

let deadlines: typeof import("../app/features/lms/world3d/deadlines");
test.beforeAll(async () => {
  const server = await createServer({ configFile: "tests/vite.config.ts", server: { middlewareMode: true, hmr: false } });
  try {
    deadlines = (await server.ssrLoadModule("/app/features/lms/world3d/deadlines.ts")) as typeof deadlines;
  } finally {
    await server.close();
  }
});

// Wednesday 4 November 2026, noon in Jakarta. Everything reads in that zone.
const zone = { timeZone: "Asia/Jakarta" };
const now = Date.parse("2026-11-04T05:00:00Z");
const work = (id: string, type: UpcomingWork["type"], dueAt: string, courseId = "c1"): UpcomingWork => ({
  id, courseId, type, title: `Judul ${id}`, courseName: "Fisika Kelas XI", dueAt, status: "not_started",
});

const today = work("today", "quiz", "2026-11-04T09:00:00Z"); // 16.00
const tomorrow = work("tomorrow", "quiz", "2026-11-05T09:00:00Z"); // 16.00
const friday = work("friday", "assignment", "2026-11-06T07:00:00Z"); // 14.00, 50 hours away
const monday = work("monday", "quiz", "2026-11-09T01:00:00Z", "c2"); // 08.00
const late = work("late", "assignment", "2026-11-03T09:00:00Z"); // yesterday 16.00

test("a deadline reads as the student would say it, with how long is left", () => {
  expect(deadlines.dueText(today.dueAt, now, zone)).toEqual({ tone: "soon", text: "Hari ini, 16.00" });
  expect(deadlines.dueText(tomorrow.dueAt, now, zone)).toEqual({ tone: "soon", text: "Besok, 16.00" });
  expect(deadlines.dueText(friday.dueAt, now, zone)).toEqual({ tone: "later", text: "Jumat, 14.00 · 2 hari lagi" });
  expect(deadlines.dueText(monday.dueAt, now, zone)).toEqual({ tone: "later", text: "Senin, 08.00 · 5 hari lagi" });
  expect(deadlines.dueText(late.dueAt, now, zone)).toEqual({ tone: "late", text: "Terlambat · Kemarin, 16.00" });
});

test("days are calendar days: late tonight and early tomorrow are a day apart", () => {
  const tonight = Date.parse("2026-11-04T16:30:00Z"); // 23.30 in Jakarta
  expect(deadlines.dueText("2026-11-04T18:30:00Z", tonight, zone).text).toBe("Besok, 01.30");
});

test("urgent means late or less than 48 hours away, and no more", () => {
  const HOUR = 3_600_000;
  expect(deadlines.isUrgent({ dueAt: new Date(now - HOUR).toISOString() }, now)).toBe(true);
  expect(deadlines.isUrgent({ dueAt: new Date(now + 48 * HOUR - 1).toISOString() }, now)).toBe(true);
  expect(deadlines.isUrgent({ dueAt: new Date(now + 48 * HOUR).toISOString() }, now)).toBe(false);
});

test("the urgent ones are split from the rest, each keeping its order", () => {
  const { soon, later } = deadlines.splitDeadlines([late, today, tomorrow, friday, monday], now);
  expect(soon.map((item) => item.id)).toEqual(["late", "today", "tomorrow"]);
  expect(later.map((item) => item.id)).toEqual(["friday", "monday"]);
});

test("a sign, the dock and the HUD chip say the same thing in their own words", () => {
  expect(deadlines.tagText(tomorrow, now, zone)).toBe("Kuis besok · 16.00");
  expect(deadlines.tagText(today, now, zone)).toBe("Kuis hari ini · 16.00");
  expect(deadlines.tagText(late, now, zone)).toBe("Tugas terlambat");
  expect(deadlines.dockText(tomorrow, now, zone)).toBe("Tenggat besok · 16.00");
  expect(deadlines.dockText(late, now, zone)).toBe("Tenggat terlambat");
  expect(deadlines.soonChip([tomorrow], now, zone)).toBe("1 besok");
  expect(deadlines.soonChip([late], now, zone)).toBe("1 terlambat");
  expect(deadlines.soonChip([today, tomorrow], now, zone)).toBe("2 segera");
});

test("each course gets the tag of its most urgent work only, and nothing that can wait", () => {
  const second = work("second", "quiz", "2026-11-05T11:00:00Z");
  const tags = deadlines.urgentTags([tomorrow, second, friday, monday], now, zone);
  expect([...tags.entries()]).toEqual([["c1", "Kuis besok · 16.00"]]);
});

test("in the 3D world a quiz leads to the classroom's quiz board and an assignment to its hall; in 2D, to their pages", () => {
  expect(deadlines.deadlineHref(tomorrow, true)).toBe("/courses/c1/kelas?fokus=kuis&kuis=tomorrow");
  expect(deadlines.deadlineHref(friday, true)).toBe("/courses/c1/balai/friday");
  expect(deadlines.deadlineHref(tomorrow, false)).toBe("/quizzes/tomorrow");
  expect(deadlines.deadlineHref(friday, false)).toBe("/assignments/friday");
});

import type { UpcomingWork } from "../types";
import { classroomUrl } from "./classroom-focus";

// What the world says about a deadline: how soon it is, in the student's own
// words ("Besok, 16.00"), and where it leads. Pure: `now` and the time zone are
// arguments, so the same input reads the same on every device and in tests.

/** Work due within this long (or already late) is urgent: amber on the HUD, signs and dock. */
export const URGENT_HOURS = 48;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type Zone = { timeZone?: string };

export type DueTone = "late" | "soon" | "later";

const clock = (at: Date, zone: Zone) => {
  const parts = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...zone }).formatToParts(at);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("hour")}.${part("minute")}`;
};

const weekday = (at: Date, zone: Zone) => new Intl.DateTimeFormat("id-ID", { weekday: "long", ...zone }).format(at);

// Calendar days, not 24-hour spans: 23.00 tonight and 01.00 tomorrow are a day apart.
function dayNumber(at: Date, zone: Zone) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", ...zone }).formatToParts(at);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day")) / DAY;
}

function daysAway(dueAt: string, now: number, zone: Zone) {
  return dayNumber(new Date(dueAt), zone) - dayNumber(new Date(now), zone);
}

export function isUrgent(item: Pick<UpcomingWork, "dueAt">, now: number) {
  return Date.parse(item.dueAt) - now < URGENT_HOURS * HOUR;
}

/** The urgent ones first (soonest first, as given), then the rest. */
export function splitDeadlines(items: UpcomingWork[], now: number) {
  return {
    soon: items.filter((item) => isUrgent(item, now)),
    later: items.filter((item) => !isUrgent(item, now)),
  };
}

/** "Besok, 16.00", "Jumat, 14.00 · 3 hari lagi", "Terlambat · Kemarin, 16.00". */
export function dueText(dueAt: string, now: number, zone: Zone = {}): { tone: DueTone; text: string } {
  const due = new Date(dueAt);
  const away = daysAway(dueAt, now, zone);
  const day = away === 0 ? "Hari ini" : away === 1 ? "Besok" : away === -1 ? "Kemarin" : weekday(due, zone);
  const when = `${day}, ${clock(due, zone)}`;
  if (due.getTime() < now) return { tone: "late", text: `Terlambat · ${when}` };
  const tone = isUrgent({ dueAt }, now) ? "soon" : "later";
  return { tone, text: away >= 2 ? `${when} · ${away} hari lagi` : when };
}

/** The word for the day: "hari ini", "besok", a weekday, or "terlambat". */
export function dayWord(dueAt: string, now: number, zone: Zone = {}) {
  if (Date.parse(dueAt) < now) return "terlambat";
  const away = daysAway(dueAt, now, zone);
  if (away === 0) return "hari ini";
  if (away === 1) return "besok";
  return weekday(new Date(dueAt), zone);
}

// "besok · 16.00", or just "terlambat": a late deadline has no time worth reading out.
function whenText(item: UpcomingWork, now: number, zone: Zone) {
  const word = dayWord(item.dueAt, now, zone);
  return word === "terlambat" ? word : `${word} · ${clock(new Date(item.dueAt), zone)}`;
}

/** The line on an island's sign: "Kuis besok · 16.00", "Tugas terlambat". */
export function tagText(item: UpcomingWork, now: number, zone: Zone = {}) {
  return `${item.type === "quiz" ? "Kuis" : "Tugas"} ${whenText(item, now, zone)}`;
}

/** The small line above the dock's title: "Tenggat besok · 16.00". */
export function dockText(item: UpcomingWork, now: number, zone: Zone = {}) {
  return `Tenggat ${whenText(item, now, zone)}`;
}

/** The chip on the HUD's Tenggat button: "1 besok" for one, "3 segera" for several. */
export function soonChip(soon: UpcomingWork[], now: number, zone: Zone = {}) {
  const only = soon.length === 1 ? dayWord(soon[0]!.dueAt, now, zone) : null;
  return only === "hari ini" || only === "besok" || only === "terlambat" ? `1 ${only}` : `${soon.length} segera`;
}

/** The most urgent open work of each course, for the tag on its island's sign. */
export function urgentTags(items: UpcomingWork[], now: number, zone: Zone = {}) {
  const tags = new Map<string, string>();
  for (const item of items) {
    if (isUrgent(item, now) && !tags.has(item.courseId)) tags.set(item.courseId, tagText(item, now, zone));
  }
  return tags;
}

/**
 * Where a deadline leads. In the 3D world a quiz is at the classroom's quiz board
 * and an assignment is in its hall (the five posts); in the 2D world both have a page.
 */
export function deadlineHref(item: UpcomingWork, world3d: boolean) {
  if (!world3d) return item.type === "quiz" ? `/quizzes/${item.id}` : `/assignments/${item.id}`;
  return item.type === "quiz"
    ? classroomUrl(item.courseId, { focus: "kuis", quizId: item.id })
    : `/courses/${encodeURIComponent(item.courseId)}/balai/${encodeURIComponent(item.id)}`;
}

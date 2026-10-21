import type { PublicationStatus, WorkStatus } from "../types";

export function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// For fields where leading/trailing whitespace is content (lesson bodies).
export function rawText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function flag(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

export function jsonField<T>(formData: FormData, name: string): T | null {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// <input type="datetime-local"> holds wall-clock time without a zone.
export function localToIso(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatJoinCode(code: string) {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export function joinLink(origin: string, code: string) {
  return `${origin}/courses/join?code=${encodeURIComponent(code)}`;
}

export const workStatusLabel: Record<WorkStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  closed: "Ditutup",
  archived: "Diarsipkan",
};

export const publicationStatusLabel: Record<PublicationStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Diarsipkan",
};

export function moveItem(ids: string[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  const [moved] = next.splice(index, 1);
  if (moved === undefined) return ids;
  next.splice(target, 0, moved);
  return next;
}

export function plural(count: number, one: string) {
  return `${count} ${one}`;
}

import { useSyncExternalStore } from "react";

// The lab tutor points at a part of the machine the way the PDF tutor points at a page:
// it plans its steps before it speaks, each with the first words it will say about that
// step, and the app shows each one as its words are heard (lib/spoken-cues.ts). The tutor
// lives in the spirit's bubble and the lab in its station, so they meet here, the way the
// spirit's mood does (world3d/spirit-store.ts): the tutor writes, the lab draws.

export type LabPointerStep = { part: string; say: string | null; caption: string | null };
export type LabPointerPlan = { steps: LabPointerStep[] };
/** What the lab draws right now: a ring on the part marked `data-lab-part={part}`. */
export type LabPointed = { part: string; caption: string | null };

export const MAX_POINTER_STEPS = 4;

const clean = (value: unknown, max: number) => {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text ? text.slice(0, max) : null;
};

/**
 * Reads the arguments of the tutor's `point_at_lab_part` call. Throws a message the tutor
 * can act on: it is sent back as the tool's error, which means nothing was shown.
 */
export function parseLabPointer(args: unknown, validParts: readonly string[]): LabPointerPlan {
  const raw = args && typeof args === "object" ? (args as Record<string, unknown>) : {};
  // A model sometimes flattens a one-step plan into the arguments themselves.
  const list = Array.isArray(raw.steps) ? raw.steps : typeof raw.part === "string" ? [raw] : [];
  if (list.length === 0) throw new Error(`Isi steps dengan 1–${MAX_POINTER_STEPS} langkah.`);
  if (list.length > MAX_POINTER_STEPS) throw new Error(`Maksimal ${MAX_POINTER_STEPS} langkah dalam satu panggilan.`);
  const steps = list.map((item) => {
    const step = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const part = typeof step.part === "string" ? step.part : "";
    if (!validParts.includes(part)) {
      throw new Error(`Bagian "${part || "?"}" tidak ada di lab ini. Pilih salah satu dari: ${validParts.join(", ")}.`);
    }
    return { part, say: clean(step.say, 80), caption: clean(step.caption, 60) };
  });
  return { steps };
}

type State = { steps: LabPointerStep[]; revealed: number; current: LabPointed | null };

const EMPTY: State = { steps: [], revealed: 0, current: null };
const listeners = new Set<() => void>();
let state = EMPTY;

const currentOf = (steps: LabPointerStep[], revealed: number): LabPointed | null => {
  const step = revealed > 0 ? steps[revealed - 1] : undefined;
  return step ? { part: step.part, caption: step.caption } : null;
};

function set(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

export const labPointer = {
  /** A new plan, replacing any earlier one. `revealed` of its steps may show at once. */
  show(plan: LabPointerPlan, revealed = 0) {
    set({ steps: plan.steps, revealed, current: currentOf(plan.steps, revealed) });
  },
  /** The first `count` steps may now be shown; the ring sits on the latest of them. */
  reveal(count: number) {
    const revealed = Math.min(state.steps.length, count);
    if (revealed <= state.revealed) return;
    set({ ...state, revealed, current: currentOf(state.steps, revealed) });
  },
  clear() {
    if (state !== EMPTY) set(EMPTY);
  },
  get: () => state.current,
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useLabPointer() {
  return useSyncExternalStore(subscribe, () => state.current, () => null);
}

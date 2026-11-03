import { useSyncExternalStore } from "react";

// The tutor spirit lives in two places (the room's scene and a small view of
// its own at a station) while its conversation lives in the overlay. They meet
// here: the conversation writes the mood, the spirits read it every frame, and
// either can open or close the conversation.

export type SpiritMood = "idle" | "listening" | "thinking" | "speaking";

const state = { mood: "idle" as SpiritMood, level: () => 0, open: false };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const spirit = {
  /** Read every frame by the 3D spirit; never triggers a render. */
  get: () => state,
  setMood(mood: SpiritMood, level: () => number = () => 0) {
    state.mood = mood;
    state.level = level;
  },
  setOpen(open: boolean) {
    if (state.open === open) return;
    state.open = open;
    notify();
  },
  toggle() {
    spirit.setOpen(!state.open);
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useSpiritOpen() {
  return useSyncExternalStore(subscribe, () => state.open, () => false);
}

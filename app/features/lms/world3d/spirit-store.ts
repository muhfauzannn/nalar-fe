import { useSyncExternalStore } from "react";

// The tutor spirit lives in two places (the room's scene and a small view of
// its own at a station) while its conversation lives in the overlay. They meet
// here: the conversation writes the mood, the spirits read it every frame, and
// either can open or close the conversation.

export type SpiritMood = "idle" | "listening" | "thinking" | "speaking";

/** A point on the screen, in the page's client pixels. */
export type SpiritGaze = { x: number; y: number };

const state = {
  mood: "idle" as SpiritMood,
  level: () => 0,
  open: false,
  gaze: null as SpiritGaze | null,
  bubble: null as HTMLElement | null,
};
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const spirit = {
  /** Read every frame by the 3D spirit; never triggers a render. */
  get: () => state,
  setMood(mood: SpiritMood, level: () => number = () => 0) {
    state.mood = mood;
    state.level = level;
  },
  /**
   * Where the spirit is looking: the spot on the page the tutor is pointing at, or null
   * when it points at nothing. The point moves every frame while the tutor's cursor
   * travels, so only starting and stopping to look notifies listeners.
   */
  lookAt(point: SpiritGaze | null) {
    const was = state.gaze !== null;
    state.gaze = point;
    if (was !== (point !== null)) notify();
  },
  /**
   * The conversation bubble while it is on screen (null otherwise). Whichever tutor draws
   * it registers it here, so the station underneath can make room for it.
   */
  setBubble(element: HTMLElement | null) {
    if (state.bubble === element) return;
    state.bubble = element;
    notify();
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

/** The tutor's bubble element while it is open, for the station that has to leave room for it. */
export function useSpiritBubble() {
  return useSyncExternalStore(subscribe, () => state.bubble, () => null);
}

/** Whether the spirit is looking at something the tutor points at. */
export function useSpiritGazing() {
  return useSyncExternalStore(subscribe, () => state.gaze !== null, () => false);
}

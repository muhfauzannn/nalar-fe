import { useSyncExternalStore } from "react";
import type { SpiritFrame, SpiritSpot } from "./spirit-spot";

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
  /** Where the student dragged the spirit to at a station; null while it is in its corner. */
  spot: null as SpiritSpot | null,
  /** The spirit's box at a station, so the conversation bubble can hang from it; null away from a station. */
  frame: null as SpiritFrame | null,
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
  setSpot(spot: SpiritSpot | null) {
    if (state.spot?.fx === spot?.fx && state.spot?.fy === spot?.fy) return;
    state.spot = spot;
    notify();
  },
  setFrame(frame: SpiritFrame | null) {
    const was = state.frame;
    if (
      was === frame ||
      (was && frame && was.left === frame.left && was.top === frame.top && was.size === frame.size && was.boxW === frame.boxW && was.boxH === frame.boxH)
    )
      return;
    state.frame = frame;
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

/** Whether the spirit is looking at something the tutor points at. */
export function useSpiritGazing() {
  return useSyncExternalStore(subscribe, () => state.gaze !== null, () => false);
}

/** Where the student put the spirit (null while it is in its corner). */
export function useSpiritSpot() {
  return useSyncExternalStore(subscribe, () => state.spot, () => null);
}

/** The spirit's box and the room it sits in, for the bubble that hangs from it. */
export function useSpiritFrame() {
  return useSyncExternalStore(subscribe, () => state.frame, () => null);
}

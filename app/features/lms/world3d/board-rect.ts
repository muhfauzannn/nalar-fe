import { useSyncExternalStore } from "react";
import type { ClassroomFocus } from "./classroom-focus";

// Where a classroom station is on screen once the camera has settled
// square to it, so the overlay can lay its controls exactly over it. Kept apart
// from classroom.tsx so the overlay never pulls three.js into the page bundle.

export type BoardRect = {
  left: number;
  top: number;
  width: number;
  height: number;
} | null;
let surface: { focus: ClassroomFocus; rect: BoardRect } | null = null;
const rectListeners = new Set<() => void>();
export function setSurfaceRect(
  focus: ClassroomFocus | null,
  rect: BoardRect = null,
) {
  const next = focus && rect ? { focus, rect } : null;
  if (JSON.stringify(next) === JSON.stringify(surface)) return;
  surface = next;
  rectListeners.forEach((listener) => listener());
}
/** Only return a settled rectangle belonging to the requested station. */
export function useSurfaceRect(focus: ClassroomFocus) {
  return useSyncExternalStore(
    (listener) => {
      rectListeners.add(listener);
      return () => rectListeners.delete(listener);
    },
    () => (surface?.focus === focus ? surface.rect : null),
    () => null,
  );
}

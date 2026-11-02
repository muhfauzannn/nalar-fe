import { useSyncExternalStore } from "react";

// Where the classroom's blackboard is on screen once the camera has settled
// square to it, so the overlay can lay the reader exactly over it. Kept apart
// from classroom.tsx so the overlay never pulls three.js into the page bundle.

export type BoardRect = { left: number; top: number; width: number; height: number } | null;
let boardRect: BoardRect = null;
const rectListeners = new Set<() => void>();
export function setBoardRect(next: BoardRect) {
  if (JSON.stringify(next) === JSON.stringify(boardRect)) return;
  boardRect = next;
  rectListeners.forEach((listener) => listener());
}
/** The blackboard's rectangle in the canvas once the camera has settled on it; null otherwise. */
export function useBoardRect() {
  return useSyncExternalStore(
    (listener) => {
      rectListeners.add(listener);
      return () => rectListeners.delete(listener);
    },
    () => boardRect,
    () => null,
  );
}

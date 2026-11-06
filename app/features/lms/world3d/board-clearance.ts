import { useLayoutEffect, useRef, useState } from "react";

// The tutor's bubble floats over the classroom (it is drawn in the overlay layer, above the
// station's surface), so on its own it covers part of whatever the student is working on: the
// PDF, the lab, the quiz, the task book. The surface makes room instead: it gives up the strip
// the bubble overlaps, beside the content on a wide screen, above the bubble on a phone, so the
// content and its controls stay clear of the bubble.

export type Box = { left: number; top: number; right: number; bottom: number };
/** Room a surface leaves free on its right and at its bottom edge, in px. */
export type Clearance = { right: number; bottom: number };

export const NO_CLEARANCE: Clearance = { right: 0, bottom: 0 };

const GAP = 8;
// Never squeeze the surface below this, even if the bubble would still overlap it.
const MIN_WIDTH = 240;
const MIN_HEIGHT = 200;

/** The room `area` (the surface, at its full size) has to leave so that `bubble` no longer covers it. */
export function clearanceFor(area: Box, bubble: Box): Clearance {
  const overlaps =
    bubble.left < area.right && bubble.right > area.left && bubble.top < area.bottom && bubble.bottom > area.top;
  if (!overlaps) return NO_CLEARANCE;
  const width = area.right - area.left;
  const height = area.bottom - area.top;
  // A bubble that starts in the lower part of the board is the phone layout: it sits under the content.
  if (bubble.top > area.top + height * 0.4) {
    const wanted = Math.ceil(area.bottom - bubble.top + GAP);
    return { right: 0, bottom: Math.min(wanted, Math.max(0, Math.floor(height - MIN_HEIGHT))) };
  }
  const wanted = Math.ceil(area.right - bubble.left + GAP);
  return { right: Math.min(wanted, Math.max(0, Math.floor(width - MIN_WIDTH))), bottom: 0 };
}

/**
 * Measures the bubble against `surface` (the station's surface element, once it is on screen) and
 * returns the room the surface has to leave free. The surface is expected to shrink by exactly
 * that clearance, so its full size is
 * what it measures now plus what it already gave up: that keeps the result steady instead of
 * flipping each time the surface changes size. The bubble grows in with a transform, so its box
 * is built from its layout position, not from getBoundingClientRect, which would read it
 * mid-animation.
 */
export function useBubbleClearance(surface: HTMLElement | null, bubble: HTMLElement | null) {
  const [clearance, setClearance] = useState(NO_CLEARANCE);
  const applied = useRef(clearance);
  applied.current = clearance;
  useLayoutEffect(() => {
    if (!surface || !bubble) {
      setClearance(NO_CLEARANCE);
      return;
    }
    const measure = () => {
      const now = surface.getBoundingClientRect();
      const full = { left: now.left, top: now.top, right: now.right + applied.current.right, bottom: now.bottom + applied.current.bottom };
      const frame = bubble.offsetParent?.getBoundingClientRect();
      const left = (frame?.left ?? 0) + bubble.offsetLeft;
      const top = (frame?.top ?? 0) + bubble.offsetTop;
      const next = clearanceFor(full, { left, top, right: left + bubble.offsetWidth, bottom: top + bubble.offsetHeight });
      setClearance((previous) => (previous.right === next.right && previous.bottom === next.bottom ? previous : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    observer.observe(bubble);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [surface, bubble]);
  return clearance;
}

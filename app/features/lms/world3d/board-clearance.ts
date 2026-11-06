import { useLayoutEffect, useState, type RefObject } from "react";

// The tutor's bubble floats over the board (it is drawn in the overlay layer, above the
// surface), so on its own it covers part of the PDF. The reader makes room instead: it
// gives up the strip the bubble overlaps, beside it on a wide screen, above it on a phone,
// so the page and the toolbar stay clear of the bubble.

export type Box = { left: number; top: number; right: number; bottom: number };
/** Room the reader leaves free on its right and at its bottom edge, in px. */
export type Clearance = { right: number; bottom: number };

export const NO_CLEARANCE: Clearance = { right: 0, bottom: 0 };

const GAP = 8;
// Never squeeze the reader below this, even if the bubble would still overlap it.
const MIN_WIDTH = 240;
const MIN_HEIGHT = 200;

/** The room `area` (the reader) has to leave so that `bubble` no longer covers it. */
export function clearanceFor(area: Box, bubble: Box): Clearance {
  const overlaps =
    bubble.left < area.right && bubble.right > area.left && bubble.top < area.bottom && bubble.bottom > area.top;
  if (!overlaps) return NO_CLEARANCE;
  const width = area.right - area.left;
  const height = area.bottom - area.top;
  // A bubble that starts in the lower part of the board is the phone layout: it sits under the page.
  if (bubble.top > area.top + height * 0.4) {
    const wanted = Math.ceil(area.bottom - bubble.top + GAP);
    return { right: 0, bottom: Math.min(wanted, Math.max(0, Math.floor(height - MIN_HEIGHT))) };
  }
  const wanted = Math.ceil(area.right - bubble.left + GAP);
  return { right: Math.min(wanted, Math.max(0, Math.floor(width - MIN_WIDTH))), bottom: 0 };
}

/**
 * Measures the bubble against `host` (the reader's box) and returns the room to leave free.
 * The bubble grows in with a transform, so its box is built from its layout position, not
 * from getBoundingClientRect, which would read it mid-animation.
 */
export function useBubbleClearance(host: RefObject<HTMLElement | null>, bubble: HTMLElement | null) {
  const [clearance, setClearance] = useState(NO_CLEARANCE);
  useLayoutEffect(() => {
    const area = host.current;
    if (!area || !bubble) {
      setClearance(NO_CLEARANCE);
      return;
    }
    const measure = () => {
      const reader = area.getBoundingClientRect();
      const frame = bubble.offsetParent?.getBoundingClientRect();
      const left = (frame?.left ?? 0) + bubble.offsetLeft;
      const top = (frame?.top ?? 0) + bubble.offsetTop;
      const next = clearanceFor(reader, { left, top, right: left + bubble.offsetWidth, bottom: top + bubble.offsetHeight });
      setClearance((previous) => (previous.right === next.right && previous.bottom === next.bottom ? previous : next));
    };
    measure();
    // The padding this adds never changes the host's border box, so there is no feedback loop.
    const observer = new ResizeObserver(measure);
    observer.observe(area, { box: "border-box" });
    observer.observe(bubble);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [host, bubble]);
  return clearance;
}

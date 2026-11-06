// Where the student has put the tutor spirit at a station, and where its conversation bubble goes as a result.
// The spirit can be dragged to whatever part of the screen the student wants to keep clear, and the bubble hangs
// from it: below it when there is room, above it when it sits low, never off the screen.

/** Where the spirit was put, as shares (0..1) of the room it can move in, so the spot survives a resize. */
export type SpiritSpot = { fx: number; fy: number };

/** The spirit's box and the room's size, in px, the room being the overlay the spirit is positioned in. */
export type SpiritFrame = { left: number; top: number; size: number; boxW: number; boxH: number };

export type BubbleKind =
  /** A conversation: a tall bubble. */
  | "tall"
  /** A conversation while the tutor points at a lab part: folded down so the part stays in view. */
  | "compact"
  /** Only the waiting hint: as tall as its text. */
  | "auto";

export type BubbleBox = {
  left: number;
  width: number;
  /** Set for "tall" and "compact"; the hint is as tall as its text. */
  height?: number;
  maxHeight: number;
  /** The bubble hangs from the spirit's bottom edge (top) or stands on its top edge (bottom). */
  top?: number;
  bottom?: number;
};

export const SPIRIT_SIZE = 92;
const MARGIN = 8;
const GAP = 4;
const WIDTH = 23 * 16;
const TALL = 30 * 16;
const COMPACT = 13.5 * 16;
const HINT_ROOM = 160;
/** What the original, undragged layout keeps free at the top of the room: 7.5rem. */
const TALL_KEEPS = 7.5 * 16;

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

/** The spirit's top-left in px for a spot in a room of this size. */
export function spotToPx(spot: SpiritSpot, size: number, boxW: number, boxH: number) {
  return { left: clamp(spot.fx, 0, 1) * Math.max(0, boxW - size), top: clamp(spot.fy, 0, 1) * Math.max(0, boxH - size) };
}

/** The spot for a spirit whose top-left is here, kept inside the room. */
export function pxToSpot(left: number, top: number, size: number, boxW: number, boxH: number): SpiritSpot {
  const width = boxW - size;
  const height = boxH - size;
  return { fx: width > 0 ? clamp(left / width, 0, 1) : 0, fy: height > 0 ? clamp(top / height, 0, 1) : 0 };
}

/** Where the conversation bubble goes for a spirit in this frame. */
export function bubbleBoxFor(frame: SpiritFrame, kind: BubbleKind): BubbleBox {
  const width = Math.min(WIDTH, Math.max(0, frame.boxW - 2 * MARGIN));
  const below = Math.max(0, frame.boxH - (frame.top + frame.size) - GAP - MARGIN);
  const above = Math.max(0, frame.top - GAP - MARGIN);
  const wanted =
    kind === "tall" ? Math.min(TALL, Math.max(0, frame.boxH - TALL_KEEPS)) : kind === "compact" ? COMPACT : HINT_ROOM;
  // below the spirit unless that is too tight for what the bubble needs and there is more room above it
  const hangs = below >= wanted || below >= above;
  const room = hangs ? below : above;
  // the bubble lines up with the spirit's near edge: right edges when the spirit is on the right half, left edges otherwise
  const rightHalf = frame.left + frame.size / 2 > frame.boxW / 2;
  const left = clamp(rightHalf ? frame.left + frame.size - width : frame.left, MARGIN, Math.max(MARGIN, frame.boxW - width - MARGIN));
  const height = kind === "auto" ? undefined : Math.min(wanted, room);
  return {
    left,
    width,
    height,
    maxHeight: room,
    ...(hangs ? { top: frame.top + frame.size + GAP } : { bottom: frame.boxH - (frame.top - GAP) }),
  };
}

export const SPIRIT_SPOT_KEY = "nalar:spirit-spot";

export function loadSpot(): SpiritSpot | null {
  try {
    const raw = JSON.parse(localStorage.getItem(SPIRIT_SPOT_KEY) ?? "null");
    return raw && Number.isFinite(raw.fx) && Number.isFinite(raw.fy) ? { fx: clamp(raw.fx, 0, 1), fy: clamp(raw.fy, 0, 1) } : null;
  } catch {
    return null;
  }
}

export function saveSpot(spot: SpiritSpot | null) {
  try {
    if (spot) localStorage.setItem(SPIRIT_SPOT_KEY, JSON.stringify(spot));
    else localStorage.removeItem(SPIRIT_SPOT_KEY);
  } catch {
    // private mode: the spirit simply starts in its corner next time
  }
}

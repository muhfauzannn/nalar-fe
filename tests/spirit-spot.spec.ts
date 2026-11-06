import { expect, test } from "@playwright/test";
import { bubbleBoxFor, pxToSpot, SPIRIT_SIZE, spotToPx, type SpiritFrame } from "../app/features/lms/world3d/spirit-spot";

// Where the dragged spirit goes, and where its conversation bubble hangs from it.

const room = { boxW: 1280, boxH: 960 };
const corner: SpiritFrame = { left: 1280 - 16 - SPIRIT_SIZE, top: 4, size: SPIRIT_SIZE, ...room };

test("a spot is a share of the room, so it survives a resize, and stays inside the room", () => {
  expect(spotToPx({ fx: 0, fy: 0 }, 92, 1280, 960)).toEqual({ left: 0, top: 0 });
  expect(spotToPx({ fx: 1, fy: 1 }, 92, 1280, 960)).toEqual({ left: 1188, top: 868 });
  expect(spotToPx({ fx: 0.5, fy: 0.5 }, 92, 1280, 960)).toEqual({ left: 594, top: 434 });
  // out of range is pulled in
  expect(spotToPx({ fx: 3, fy: -2 }, 92, 1280, 960)).toEqual({ left: 1188, top: 0 });
  expect(pxToSpot(-50, 5000, 92, 1280, 960)).toEqual({ fx: 0, fy: 1 });
  // and the round trip holds, in any size of room
  const spot = pxToSpot(300, 400, 92, 1280, 960);
  const back = spotToPx(spot, 92, 1280, 960);
  expect(back.left).toBeCloseTo(300, 6);
  expect(back.top).toBeCloseTo(400, 6);
  expect(spotToPx(spot, 92, 390, 844).left).toBeGreaterThan(0);
  // a room no bigger than the spirit does not divide by zero
  expect(pxToSpot(10, 10, 92, 92, 92)).toEqual({ fx: 0, fy: 0 });
});

test("in its corner the bubble hangs from the spirit exactly where it always was", () => {
  const box = bubbleBoxFor(corner, "tall");
  // 23rem wide, right edge on the spirit's right edge, just under it, 30rem tall
  expect(box.width).toBe(368);
  expect(box.left + box.width).toBe(corner.left + corner.size);
  expect(box.top).toBe(corner.top + corner.size + 4);
  expect(box.bottom).toBeUndefined();
  expect(box.height).toBe(480);
});

test("a spirit low on the screen has the bubble stand on top of it instead", () => {
  const low: SpiritFrame = { ...corner, left: 40, top: 800 };
  const box = bubbleBoxFor(low, "tall");
  expect(box.top).toBeUndefined();
  // its bottom edge is just above the spirit's top edge
  expect(low.boxH - box.bottom!).toBe(low.top - 4);
  expect(box.height).toBe(480);
  // left half: the left edges line up
  expect(box.left).toBe(40);
});

test("the bubble never leaves the room, whatever the room's size", () => {
  for (const size of [{ boxW: 390, boxH: 844 }, { boxW: 768, boxH: 1024 }, { boxW: 1280, boxH: 960 }, { boxW: 320, boxH: 480 }]) {
    for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5], [0.2, 0.9]]) {
      const frame: SpiritFrame = { size: SPIRIT_SIZE, ...size, ...spotToPx({ fx: fx!, fy: fy! }, SPIRIT_SIZE, size.boxW, size.boxH) };
      for (const kind of ["tall", "compact", "auto"] as const) {
        const box = bubbleBoxFor(frame, kind);
        const label = `${size.boxW}x${size.boxH} at ${fx},${fy} ${kind}`;
        expect(box.left, label).toBeGreaterThanOrEqual(8 - 1e-9);
        expect(box.left + box.width, label).toBeLessThanOrEqual(size.boxW - 8 + 1e-9);
        expect(box.width, label).toBeGreaterThan(0);
        const top = box.top ?? size.boxH - box.bottom! - (box.height ?? 0);
        const bottom = box.top !== undefined ? top + (box.height ?? 0) : size.boxH - box.bottom!;
        expect(top, label).toBeGreaterThanOrEqual(-1e-9);
        expect(bottom, label).toBeLessThanOrEqual(size.boxH + 1e-9);
        // it never covers the spirit itself
        if (box.height !== undefined) {
          const overlapsSpirit =
            box.left < frame.left + frame.size && box.left + box.width > frame.left && top < frame.top + frame.size && bottom > frame.top;
          expect(overlapsSpirit, `${label} covers the spirit`).toBe(false);
        }
      }
    }
  }
});

test("the folded bubble and the hint keep their own heights", () => {
  expect(bubbleBoxFor(corner, "compact").height).toBe(216);
  const hint = bubbleBoxFor(corner, "auto");
  expect(hint.height).toBeUndefined();
  expect(hint.maxHeight).toBeGreaterThan(300);
});

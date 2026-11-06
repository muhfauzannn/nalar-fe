import { expect, test } from "@playwright/test";
import { clearanceFor, NO_CLEARANCE, type Box } from "../app/features/lms/world3d/board-clearance";

const box = (left: number, top: number, width: number, height: number): Box => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

// A board 1250 wide and 740 tall, like the classroom's at 1280×960.
const board = box(16, 143, 1250, 740);

test("a bubble beside the page takes its strip from the right of the reader", () => {
  const bubble = box(897, 100, 368, 480);
  // from the bubble's left edge to the reader's right edge, plus a small gap
  expect(clearanceFor(board, bubble)).toEqual({ right: 1266 - 897 + 8, bottom: 0 });
});

test("a bubble under the page takes its strip from the bottom of the reader", () => {
  const phone = box(12, 68, 366, 748);
  const bubble = box(8, 500, 374, 336);
  expect(clearanceFor(phone, bubble)).toEqual({ right: 0, bottom: 816 - 500 + 8 });
});

test("a bubble that does not touch the reader asks for nothing", () => {
  expect(clearanceFor(board, box(1300, 100, 300, 400))).toEqual(NO_CLEARANCE);
  expect(clearanceFor(board, box(897, 10, 368, 100))).toEqual(NO_CLEARANCE);
  // touching edges is not covering
  expect(clearanceFor(board, box(1266, 143, 300, 400))).toEqual(NO_CLEARANCE);
});

test("the reader is never squeezed below a readable size", () => {
  const narrow = box(0, 100, 400, 700);
  // the bubble covers almost all of it, but at least 240px of width stays
  expect(clearanceFor(narrow, box(60, 100, 340, 400))).toEqual({ right: 160, bottom: 0 });
  const short = box(0, 100, 380, 300);
  expect(clearanceFor(short, box(0, 250, 380, 400))).toEqual({ right: 0, bottom: 100 });
});

import { test, expect } from "@playwright/test";
import { buildInkPlan } from "../app/features/lms/lib/handwriting/ink-plan";
import {
  parsePdfGuidance,
  parsePdfCursor,
  pdfActionHoldSeconds,
  pdfPointerTarget,
  pdfScrollDelta,
  contextForModel,
  rotatePoint,
  rotateRect,
  type PdfViewContext,
} from "../app/features/lms/lib/pdf-tutor";
const context: PdfViewContext = {
  resourceId: "pdf-a",
  fingerprint: "f-a",
  page: 2,
  totalPages: 3,
  revision: 4,
  viewport: { x: 0, y: 0, width: 1, height: 0.6 },
  selection: null,
  image: "jpeg",
  blocks: [
    {
      id: "p2-b1",
      text: "Satu per dua",
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.05,
    },
  ],
};
const payload = () => ({
  resourceId: "pdf-a",
  page: 2,
  revision: 4,
  turnId: "turn-1",
  caption: "Perhatikan pembilang",
  actions: [{ kind: "highlight", blockId: "p2-b1" }],
});
test("text actions resolve to the actual source block, ignoring guessed coordinates", () => {
  expect(parsePdfGuidance(payload(), context, "turn-1").actions[0]).toEqual({
    kind: "highlight",
    x: 0.1,
    y: 0.2,
    width: 0.3,
    height: 0.05,
  });
});
test("written notes use the tutor panel even when the PDF has no empty space", () => {
  const crowded: PdfViewContext = {
    ...context,
    viewport: { x: 0, y: 0, width: 1, height: 1 },
    blocks: [{ id: "full", text: "Halaman padat", x: 0, y: 0, width: 1, height: 1 }],
  };
  const note = parsePdfGuidance({ ...payload(), actions: [
    { kind: "text", text: "Domain adalah himpunan asal" },
  ] }, crowded, "turn-1").actions[0];
  expect(note.placement).toBe("side");
  expect(note.text).toBe("Domain adalah himpunan asal");
  expect(note.x).toBe(0);
  expect(note.y).toBe(0);
  expect(buildInkPlan({ ...payload(), actions: [note] }, 1300).strokes).toHaveLength(0);
});
test("a plan for a page the student has left is refused, and says how to recover", () => {
  expect(() => parsePdfGuidance({ ...payload(), page: 1 }, context, "turn-1")).toThrow(/get_pdf_context/);
});

test("scrolling, selecting or a stale turn id in the model's arguments never cost a step", () => {
  // Coordinates are relative to the page, so only the page itself decides.
  const guidance = parsePdfGuidance({ ...payload(), revision: 1, turnId: "older", resourceId: "whatever" }, context, "turn-1");
  expect(guidance.turnId).toBe("turn-1");
  expect(guidance.resourceId).toBe("pdf-a");
  expect(guidance.actions).toHaveLength(1);
});

test("targets below the visible part of the page are fine: the reader scrolls to them", () => {
  const guidance = parsePdfGuidance({ ...payload(), actions: [{ kind: "point", x: 0.2, y: 0.9 }] }, context, "turn-1");
  expect(guidance.actions[0].y).toBe(0.9);
});

test("a bad step is left out and the rest of the plan still shows", () => {
  const good = { kind: "highlight", blockId: "p2-b1", say: "lihat pembilang" };
  for (const bad of [
    { kind: "execute", x: 0, y: 0 },
    { kind: "point", x: NaN, y: 0 },
    { kind: "point", x: 1.2, y: 0 },
    { kind: "highlight", blockId: "p9-b1" },
    { kind: "rectangle", x: 0.9, y: 0.2, width: 0.3, height: 0.1 },
    { kind: "text", text: "" },
    { kind: "path", x: 0, y: 0, points: [{ x: 0, y: 0 }, { x: 3, y: 0 }] },
  ]) {
    const guidance = parsePdfGuidance({ ...payload(), actions: [bad, good] }, context, "turn-1");
    expect(guidance.actions.map((action) => action.say)).toEqual(["lihat pembilang"]);
  }
});

test("a plan with no usable step is refused, and more than eight steps are cut to eight", () => {
  for (const actions of [[], undefined, [{ kind: "highlight", blockId: "p9-b1" }], [{ kind: "execute" }]]) {
    expect(() => parsePdfGuidance({ ...payload(), actions }, context, "turn-1")).toThrow();
  }
  const many = parsePdfGuidance({ ...payload(), actions: Array(9).fill({ kind: "point", x: 0.1, y: 0.1 }) }, context, "turn-1");
  expect(many.actions).toHaveLength(8);
});

test("the hand is at the newest step the words have reached, and notes do not move it", () => {
  const guidance = parsePdfGuidance({ ...payload(), actions: [
    { kind: "point", x: 0.1, y: 0.1, say: "satu" },
    { kind: "text", text: "catatan", say: "dua" },
    { kind: "point", x: 0.2, y: 0.8, say: "tiga" },
  ] }, context, "turn-1");
  expect(pdfPointerTarget(guidance, 0, null, 2)).toBeNull();
  expect(pdfPointerTarget(guidance, 2, null, 2)).toEqual({ x: 0.1, y: 0.1 });
  expect(pdfPointerTarget(guidance, 3, null, 2)).toEqual({ x: 0.2, y: 0.8 });
  expect(pdfPointerTarget(guidance, 3, null, 1)).toBeNull();
  const cue = parsePdfCursor({ ...payload(), x: 0.5, y: 0.5 }, context, "turn-1");
  expect(pdfPointerTarget(guidance, 3, cue, 2)).toEqual({ x: 0.5, y: 0.5 });
});

test("the page only scrolls when the spot is out of the comfortable part of the view", () => {
  expect(pdfScrollDelta(300, 1000)).toBeNull();
  expect(pdfScrollDelta(2000, 1000)).toBe(1650);
  expect(pdfScrollDelta(-400, 1000)).toBe(-750);
});

test("rotation and inverse rotation keep page anchors across every quarter turn", () => {
  const original = { x: 0.1, y: 0.2, width: 0.3, height: 0.15 };
  for (const angle of [0, 90, 180, 270]) {
    const roundtrip = rotateRect(rotateRect(original, angle), -angle);
    for (const key of ["x", "y", "width", "height"] as const)
      expect(roundtrip[key]).toBeCloseTo(original[key], 10);
    const p = rotatePoint(rotatePoint(original, angle), -angle);
    expect(p.x).toBeCloseTo(original.x, 10);
    expect(p.y).toBeCloseTo(original.y, 10);
  }
});

test("drawing supports free paths, horizontal arrows and arrows in either direction", () => {
  const base = payload();
  const actions = [
    {
      kind: "path",
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 },
        { x: 0.3, y: 0.1 },
      ],
    },
    { kind: "arrow", x: 0.1, y: 0.1, width: 0.2, height: 0 },
    {
      kind: "arrow",
      points: [
        { x: 0.4, y: 0.3 },
        { x: 0.2, y: 0.1 },
      ],
    },
  ];
  const parsed = parsePdfGuidance({ ...base, actions }, context, "turn-1");
  expect(parsed.actions[0].points).toHaveLength(3);
  expect(parsed.actions[1].height).toBe(0);
  expect(parsed.actions[2].points?.[0]).toEqual({ x: 0.4, y: 0.3 });
});


test("partial highlights use measured glyph geometry and do not serialize the DOM resolver", () => {
  const rect = { x: 0.12, y: 0.2, width: 0.06, height: 0.05 };
  const view: PdfViewContext = { ...context, resolveTextRange: (id, start, end) => {
    expect(id).toBe("p2-b1");
    expect(start).toBe(0);
    expect(end).toBe(4);
    return [rect];
  } };
  for (const range of [{ quote: "Satu" }, { startOffset: 0, endOffset: 4 }]) {
    const result = parsePdfGuidance({ ...payload(), actions: [
      { kind: "highlight", blockId: "p2-b1", ...range },
    ] }, view, "turn-1");
    expect(result.actions[0].rects).toEqual([rect]);
    expect(result.actions[0].width).toBeCloseTo(rect.width);
  }
  expect(contextForModel(view, "turn-1")).not.toHaveProperty("resolveTextRange");
});

test("a misquoted text range falls back to the whole block it named", () => {
  for (const range of [{ quote: "tidak ada" }, { quote: "" },
    { startOffset: -1, endOffset: 4 }, { startOffset: 3, endOffset: 2 },
    { startOffset: 0, endOffset: 100 }, { startOffset: 0.5, endOffset: 4 }]) {
    const [action] = parsePdfGuidance({ ...payload(), actions: [
      { kind: "highlight", blockId: "p2-b1", ...range },
    ] }, context, "turn-1").actions;
    expect(action.rects).toBeUndefined();
    expect(action.width).toBeCloseTo(0.3);
  }
});

test("a range the text layer cannot measure yet still highlights the block", () => {
  const view = { ...context, resolveTextRange: () => [] };
  const [action] = parsePdfGuidance({ ...payload(), actions: [
    { kind: "highlight", blockId: "p2-b1", quote: "Satu" },
  ] }, view, "turn-1").actions;
  expect(action.rects).toBeUndefined();
  expect(action.y).toBeCloseTo(0.2);
});


test("cursor cues can move between source blocks and coordinates with distinct captions", () => {
  const first = parsePdfCursor({ ...payload(), blockId: "p2-b1", caption: "Bagian pertama" }, context, "turn-1");
  expect(first.x).toBeCloseTo(0.25);
  expect(first.y).toBeCloseTo(0.225);
  expect(first.caption).toBe("Bagian pertama");
  expect(first).not.toHaveProperty("actions");
  const next = parsePdfCursor({ ...payload(), x: 0.65, y: 0.4, caption: "Lalu bagian kedua" }, context, "turn-1");
  expect(next.x).toBe(0.65);
  expect(next.caption).toBe("Lalu bagian kedua");
});

test("cursor cues refuse another page and a spot that is not on this one", () => {
  for (const change of [{ page: 1 }, { x: 2 }, { blockId: "missing", x: undefined }]) {
    expect(() => parsePdfCursor({ ...payload(), x: 0.2, y: 0.3, ...change }, context, "turn-1")).toThrow();
  }
  expect(parsePdfCursor({ ...payload(), x: 0.2, y: 0.9 }, context, "turn-1").y).toBe(0.9);
});

test("each annotation retains its own caption, and an unusable caption is dropped or shortened", () => {
  const actions = [
    { kind: "highlight", blockId: "p2-b1", caption: "Pembilang" },
    { kind: "point", x: 0.5, y: 0.3, caption: "Penyebut" },
  ];
  expect(parsePdfGuidance({ ...payload(), actions }, context, "turn-1").actions.map((a) => a.caption)).toEqual(["Pembilang", "Penyebut"]);
  for (const caption of ["", 4, null]) {
    const steps = parsePdfGuidance({ ...payload(), actions: [...actions, { ...actions[1], caption }] }, context, "turn-1").actions;
    expect(steps).toHaveLength(3);
    expect(steps[2].caption).toBeUndefined();
  }
  const long = parsePdfGuidance({ ...payload(), caption: "", actions: [{ ...actions[1], caption: "x".repeat(121) }] }, context, "turn-1");
  expect(long.actions[0].caption).toHaveLength(120);
  expect(long.caption).toHaveLength(120);
});


test("AI-chosen reading times survive parsing for cursor steps and individual captions", () => {
  const cue = parsePdfCursor({ ...payload(), blockId: "p2-b1", holdSeconds: 7.5 }, context, "turn-1");
  expect(cue.holdSeconds).toBe(7.5);
  const guidance = parsePdfGuidance({ ...payload(), holdSeconds: 4, actions: [
    { kind: "highlight", blockId: "p2-b1", caption: "Domain", holdSeconds: 3 },
    { kind: "point", x: 0.5, y: 0.3, caption: "Contoh kodomain", holdSeconds: 9 },
    { kind: "point", x: 0.6, y: 0.3, caption: "Rangkuman" },
  ] }, context, "turn-1");
  expect(guidance.actions.map((_, index) => pdfActionHoldSeconds(guidance, index))).toEqual([3, 9, 4]);
});

test("a malformed model duration falls back to the default reading time", () => {
  for (const holdSeconds of [-1, 0, 0.5, 21, Infinity, NaN, "5", null]) {
    expect(parsePdfCursor({ ...payload(), blockId: "p2-b1", holdSeconds }, context, "turn-1").holdSeconds).toBeUndefined();
    const steps = parsePdfGuidance({ ...payload(), actions: [
      { kind: "highlight", blockId: "p2-b1" },
      { kind: "point", x: 0.5, y: 0.3, holdSeconds },
    ] }, context, "turn-1").actions;
    expect(steps).toHaveLength(2);
    expect(steps[1].holdSeconds).toBeUndefined();
  }
});

import { test, expect } from "@playwright/test";
import { buildInkPlan } from "../app/features/lms/lib/handwriting/ink-plan";
import {
  parsePdfGuidance,
  parsePdfCursor,
  pdfActionHoldSeconds,
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
test("different document, page, viewport revision and interrupted turn cannot mutate the page", () => {
  for (const change of [
    { resourceId: "pdf-b" },
    { page: 1 },
    { revision: 3 },
    { turnId: "turn-0" },
  ]) {
    expect(() =>
      parsePdfGuidance({ ...payload(), ...change }, context, "turn-1"),
    ).toThrow(/Konteks/);
  }
});
test("rejects malformed, unknown, excessive, off-page and hidden actions atomically", () => {
  for (const actions of [
    [],
    Array(9).fill({ kind: "point", x: 0.1, y: 0.1 }),
    [{ kind: "execute", x: 0, y: 0 }],
    [{ kind: "point", x: NaN, y: 0 }],
    [{ kind: "point", x: 1.2, y: 0 }],
    [{ kind: "highlight", blockId: "p9-b1" }],
    [{ kind: "point", x: 0.2, y: 0.9 }],
    [{ kind: "rectangle", x: 0.9, y: 0.2, width: 0.3, height: 0.1 }],
    [{ kind: "text", x: 0.2, y: 0.2, text: "" }],
    [
      {
        kind: "path",
        x: 0,
        y: 0,
        points: [
          { x: 0, y: 0 },
          { x: 3, y: 0 },
        ],
      },
    ],
  ]) {
    expect(() =>
      parsePdfGuidance({ ...payload(), actions }, context, "turn-1"),
    ).toThrow();
  }
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

test("invalid text ranges are rejected before any guidance is applied", () => {
  for (const range of [{ quote: "tidak ada" }, { quote: "" },
    { startOffset: -1, endOffset: 4 }, { startOffset: 3, endOffset: 2 },
    { startOffset: 0, endOffset: 100 }, { startOffset: 0.5, endOffset: 4 }]) {
    expect(() => parsePdfGuidance({ ...payload(), actions: [
      { kind: "highlight", blockId: "p2-b1", ...range },
    ] }, context, "turn-1")).toThrow(/Rentang/);
  }
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

test("cursor cues reject stale identities, hidden targets and invalid captions", () => {
  for (const change of [{ page: 1 }, { revision: 3 }, { turnId: "old" },
    { resourceId: "other" }, { x: 2 }, { y: 0.9 }, { caption: "" },
    { caption: "x".repeat(121) }, { blockId: "missing" }]) {
    expect(() => parsePdfCursor({ ...payload(), x: 0.2, y: 0.3, ...change }, context, "turn-1")).toThrow();
  }
});

test("each annotation retains its own caption and validates captions atomically", () => {
  const actions = [
    { kind: "highlight", blockId: "p2-b1", caption: "Pembilang" },
    { kind: "point", x: 0.5, y: 0.3, caption: "Penyebut" },
  ];
  expect(parsePdfGuidance({ ...payload(), actions }, context, "turn-1").actions.map((a) => a.caption)).toEqual(["Pembilang", "Penyebut"]);
  for (const caption of ["", "x".repeat(121), 4, null]) {
    expect(() => parsePdfGuidance({ ...payload(), actions: [...actions, { ...actions[1], caption }] }, context, "turn-1")).toThrow(/Caption/);
  }
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

test("malformed model durations reject the whole visual batch", () => {
  for (const holdSeconds of [-1, 0, 0.5, 21, Infinity, NaN, "5", null]) {
    expect(() => parsePdfCursor({ ...payload(), blockId: "p2-b1", holdSeconds }, context, "turn-1")).toThrow(/holdSeconds/);
    expect(() => parsePdfGuidance({ ...payload(), actions: [
      { kind: "highlight", blockId: "p2-b1" },
      { kind: "point", x: 0.5, y: 0.3, holdSeconds },
    ] }, context, "turn-1")).toThrow(/holdSeconds/);
  }
});

import { test, expect } from "@playwright/test";
import {
  parsePdfGuidance,
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

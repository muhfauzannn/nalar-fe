import { VIEWS, rect, line, poly, spark, type Icon } from "./fun";
import { toss, tossLag, tossLag2, sparkle } from "./motions";

// A study notebook gathers its lesson cards, then rests between each turn.
export const studyBook: Icon = {
  name: "study-book",
  frames: 180,
  still: 90,
  line: 5,
  extrude: VIEWS.right.extrude,
  layers: [
    {
      id: "book",
      p: [134, 322],
      a: [-116, 52],
      m: { ...toss, k: 0.45 },
      shapes: [],
    },
    {
      id: "face",
      parent: "book",
      tilt: VIEWS.right.tilt,
      shapes: [
        { d: rect(-116, -86, 244, 192, 12), fill: "main", depth: 1.2 },
        { d: rect(-107, -88, 226, 179, 9), fill: "white", depth: 0.65 },
        { d: rect(-4, -87, 12, 178, 2), fill: "tint", depth: 0.2 },
        { d: line([-82, -46], [-26, -46]) },
        { d: line([-82, -22], [-26, -22]) },
        { d: line([-82, 2], [-40, 2]) },
        { d: rect(-82, 28, 48, 33, 5), fill: "ok", depth: 0.25 },
      ],
    },
    {
      parent: "face",
      a: [12, 75],
      p: [12, 75],
      m: { ...tossLag2, at: 5, k: 0.8 },
      shapes: [
        { d: rect(12, -70, 86, 140, 7), fill: "white", depth: 0.45 },
        { d: line([30, -45], [78, -45]) },
        { d: line([30, -22], [78, -22]) },
        { d: line([30, 1], [66, 1]) },
      ],
    },
    {
      parent: "face",
      a: [75, -82],
      p: [75, -82],
      m: { ...tossLag, at: 9, k: 1.2 },
      shapes: [
        {
          d: poly([
            [61, -91],
            [88, -91],
            [88, -17],
            [75, -30],
            [61, -17],
          ]),
          fill: "ok",
          depth: 0.5,
        },
      ],
    },
    {
      parent: "book",
      a: [134, -102],
      p: [134, -102],
      m: sparkle(43),
      shapes: [{ d: spark(134, -102, 23), fill: "white" }],
    },
    {
      parent: "book",
      a: [-121, -103],
      p: [-121, -103],
      m: sparkle(51),
      shapes: [{ d: spark(-121, -103, 14), fill: "white" }],
    },
  ],
};

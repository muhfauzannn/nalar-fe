import { cylinder, fitProjection, insetPlan, iso, joinPaths, lineOnTop, pathOf, planOutline, ring, slabOf, type Flat, type Plan, type Point3 } from "../iso/iso-kit";
import { AMPLITUDE, type Gear } from "./model";

// The wave machine on its bench (kit units: x along the bench, y across, z up).
// The wheel and the graph board stand in the plane y = 0 facing the viewer; the
// peg's height above the hub and the pen's height above the board's middle use
// the same scale S, so the projection line between them is level.

export const WIDTH = 680;
export const HEIGHT = 330;
export const S = 15;
export const HUB: Point3 = [-24, 0, 70];
export const WHEEL_R = 34;
export const BOARD = { x0: 30, x1: 196, z0: HUB[2] - 2 * S - 8, z1: HUB[2] + 2 * S + 8 };
export const GRAPH = { x0: 40, x1: 186 };
export const CRANK: Point3 = [-24, 8, 18];
export const CRANK_R = 11;
const BENCH: Plan = { x: -68, y: -20, w: 280, d: 42, r: 5 };
const BENCH_H = 7;
const FOOT_H = 4;

export const P = fitProjection(
  [
    [BENCH.x, BENCH.y, -BENCH_H - FOOT_H],
    [BENCH.x + BENCH.w, BENCH.y + BENCH.d, -BENCH_H - FOOT_H],
    [BENCH.x, BENCH.y + BENCH.d, -BENCH_H - FOOT_H],
    [BENCH.x + BENCH.w, BENCH.y, BOARD.z1 + 8],
    [HUB[0] - WHEEL_R, 0, HUB[2] + WHEEL_R + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: 80, elevation: 22 },
);

export const at = (point: Point3): Flat => iso(point, P);
const solid = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const seg = (a: Point3, b: Point3) => pathOf([at(a), at(b)]);
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** A circle standing in the x–z plane at depth y. */
export function upright(center: Point3, r: number, steps = 32) {
  const [cx, cy, cz] = center;
  return pathOf(Array.from({ length: steps }, (_, i) => at([cx + r * Math.cos((i / steps) * Math.PI * 2), cy, cz + r * Math.sin((i / steps) * Math.PI * 2)])), true);
}
const plate = (corners: Array<[number, number]>, y: number) => pathOf(corners.map(([x, z]) => at([x, y, z])), true);

/** The graph: crank angle θ (degrees) across, the wave's height up. */
export const graphX = (theta: number) => GRAPH.x0 + ((GRAPH.x1 - GRAPH.x0) * theta) / 360;
export const graphAt = (theta: number, y: number, depth = 0.6): Flat => at([graphX(theta), depth, HUB[2] + y * S]);

// ---- the bench ------------------------------------------------------------------------------

const FEET: Array<[number, number]> = [
  [BENCH.x + 10, BENCH.y + 9],
  [BENCH.x + BENCH.w - 10, BENCH.y + 9],
  [BENCH.x + 10, BENCH.y + BENCH.d - 9],
  [BENCH.x + BENCH.w - 10, BENCH.y + BENCH.d - 9],
];
const SCREWS: Array<[number, number]> = [
  [BENCH.x + 5, BENCH.y + 5],
  [BENCH.x + BENCH.w - 5, BENCH.y + 5],
  [BENCH.x + 5, BENCH.y + BENCH.d - 5],
  [BENCH.x + BENCH.w - 5, BENCH.y + BENCH.d - 5],
];
const LABEL: Plan = { x: 140, y: BENCH.y + BENCH.d - 12, w: 46, d: 9, r: 1.5 };
export const BENCH_ART = {
  halo: solid(BENCH, -BENCH_H - FOOT_H, BENCH_H).fill,
  feet: FEET.map(([x, y]) => cylinder(x, y, 5, -BENCH_H - FOOT_H, FOOT_H, P, 18)),
  slab: solid(BENCH, -BENCH_H, BENCH_H, 8, 1.4),
  groove: planOutline(insetPlan(BENCH, 4), 0, P),
  screws: SCREWS.map(([x, y]) => at([x, y, 0])),
  screwRings: joinPaths(SCREWS.map(([x, y]) => ring(x, y, 1.8, 0, P, 14))),
  label: solid(LABEL, 0, 0.7, 4),
  labelLine: planOutline(insetPlan(LABEL, 1.4), 0.7, P),
  labelRules: joinPaths([0, 1, 2].map((row) => lineOnTop([LABEL.x + 6, LABEL.y + 2.6 + row * 1.9], [LABEL.x + (row === 1 ? 26 : 36), LABEL.y + 2.6 + row * 1.9], 0.7, P))),
};

// ---- the wheel stand -------------------------------------------------------------------------

export const STAND_ART = {
  foot: solid({ x: HUB[0] - 16, y: -12, w: 32, d: 12, r: 2 }, 0, 3.5, 4, 0.6),
  posts: [HUB[0] - 9, HUB[0] + 9].map((x) => solid({ x: x - 2, y: -8, w: 4, d: 4, r: 0.8 }, 3.5, HUB[2] - 3.5, 3, 0.4)),
  yoke: solid({ x: HUB[0] - 11, y: -8, w: 22, d: 4, r: 1 }, HUB[2] - 2, 4, 3, 0.4),
  axle: seg([HUB[0], -6, HUB[2]], [HUB[0], 3, HUB[2]]),
  footScrews: [at([HUB[0] - 13, -6, 3.5]), at([HUB[0] + 13, -6, 3.5])],
};

/** The wheel itself: rim, angle ticks every 30°, and the hub. Its spokes turn (wheelAt). */
export const WHEEL_ART = {
  disc: upright([HUB[0], 1, HUB[2]], WHEEL_R, 48),
  rim: upright([HUB[0], 1.1, HUB[2]], WHEEL_R - 2.4, 48),
  ticks: joinPaths(
    Array.from({ length: 12 }, (_, i) => {
      const a = rad(i * 30);
      const inner = WHEEL_R - (i % 3 === 0 ? 5.5 : 4);
      return seg([HUB[0] + inner * Math.cos(a), 1.15, HUB[2] + inner * Math.sin(a)], [HUB[0] + (WHEEL_R - 2.4) * Math.cos(a), 1.15, HUB[2] + (WHEEL_R - 2.4) * Math.sin(a)]);
    }),
  ),
  // the unit circle's horizontal and vertical diameters, faint
  axes: joinPaths([seg([HUB[0] - WHEEL_R + 2.4, 1.12, HUB[2]], [HUB[0] + WHEEL_R - 2.4, 1.12, HUB[2]]), seg([HUB[0], 1.12, HUB[2] - WHEEL_R + 2.4], [HUB[0], 1.12, HUB[2] + WHEEL_R - 2.4])]),
  hub: upright([HUB[0], 2.4, HUB[2]], 3.2, 20),
  hubDot: at([HUB[0], 2.6, HUB[2]]),
};

/** The parts that turn with the wheel at angle φ: two spokes, the slot along one, and the peg A units out. */
export function wheelAt(phi: number, amplitude: number) {
  const a = rad(phi);
  const dir = (r: number, y = 1.3): Point3 => [HUB[0] + r * Math.cos(a), y, HUB[2] + r * Math.sin(a)];
  const across = (r: number, off: number, y = 1.3): Point3 => [HUB[0] + r * Math.cos(a) - off * Math.sin(a), y, HUB[2] + r * Math.sin(a) + off * Math.cos(a)];
  const back = (r: number): Point3 => [HUB[0] - r * Math.cos(a), 1.3, HUB[2] - r * Math.sin(a)];
  const slotFrom = AMPLITUDE.min * S - 3;
  const slotTo = AMPLITUDE.max * S + 2;
  return {
    spoke: pathOf([at(across(3, -1.6)), at(across(WHEEL_R - 2.4, -1.6)), at(across(WHEEL_R - 2.4, 1.6)), at(across(3, 1.6))], true),
    slot: pathOf([at(across(slotFrom, -0.7, 1.4)), at(across(slotTo, -0.7, 1.4)), at(across(slotTo, 0.7, 1.4)), at(across(slotFrom, 0.7, 1.4))], true),
    counter: seg(back(3), back(WHEEL_R - 2.4)),
    peg: at(dir(amplitude * S, 2.4)),
    pegPoint: dir(amplitude * S, 2.4),
  };
}

// ---- the crank, its pulley and the belt up to the wheel's pulley ----------------------------

export const CRANK_ART = {
  post: solid({ x: CRANK[0] - 2.5, y: CRANK[1] - 3, w: 5, d: 5, r: 1 }, 0, CRANK[2] - 2, 3, 0.4),
  disc: upright([CRANK[0], CRANK[1] + 0.5, CRANK[2]], CRANK_R + 1.5, 32),
  ring: upright([CRANK[0], CRANK[1] + 0.6, CRANK[2]], CRANK_R - 1, 32),
  hub: upright([CRANK[0], CRANK[1] + 1, CRANK[2]], 1.8, 14),
};
export function crankAt(theta: number) {
  const a = rad(theta);
  const end: Point3 = [CRANK[0] + CRANK_R * Math.cos(a), CRANK[1] + 1.4, CRANK[2] + CRANK_R * Math.sin(a)];
  return { arm: seg([CRANK[0], CRANK[1] + 1.2, CRANK[2]], end), handle: at([end[0], end[1] + 1.2, end[2]]) };
}
/** The belt from the crank's pulley (behind the crank disc) to the wheel's pulley; a 2× gear has a pulley half the size on the wheel. */
export function beltFor(gear: Gear) {
  const crankR = 6;
  const wheelR = gear === 1 ? 6 : 3;
  const yBelt = 4;
  const top = (cx: number, cz: number, r: number): Point3 => [cx - r, yBelt, cz];
  const bottom = (cx: number, cz: number, r: number): Point3 => [cx + r, yBelt, cz];
  // the belt runs up the bench side, so its two straight runs are the pulleys' left and right tangents
  return {
    pulleyWheel: upright([HUB[0], yBelt, HUB[2]], wheelR, 20),
    pulleyCrank: upright([CRANK[0], yBelt, CRANK[2]], crankR, 20),
    band: pathOf([at(top(HUB[0], HUB[2], wheelR)), at(top(CRANK[0], CRANK[2], crankR)), at(bottom(CRANK[0], CRANK[2], crankR)), at(bottom(HUB[0], HUB[2], wheelR))], true),
    runs: joinPaths([seg(top(HUB[0], HUB[2], wheelR), top(CRANK[0], CRANK[2], crankR)), seg(bottom(HUB[0], HUB[2], wheelR), bottom(CRANK[0], CRANK[2], crankR))]),
    teeth: joinPaths(
      Array.from({ length: gear === 1 ? 12 : 6 }, (_, i) => {
        const a = (i / (gear === 1 ? 12 : 6)) * Math.PI * 2;
        return seg([HUB[0] + (wheelR - 0.9) * Math.cos(a), yBelt + 0.1, HUB[2] + (wheelR - 0.9) * Math.sin(a)], [HUB[0] + wheelR * Math.cos(a), yBelt + 0.1, HUB[2] + wheelR * Math.sin(a)]);
      }),
    ),
  };
}

// ---- the graph board, its rail and the pen carriage ------------------------------------------

export const BOARD_ART = {
  legs: [BOARD.x0 + 8, BOARD.x1 - 8].map((x) => solid({ x: x - 2.5, y: -6, w: 5, d: 5, r: 1 }, 0, BOARD.z0, 3, 0.4)),
  back: plate(
    [
      [BOARD.x0, BOARD.z0],
      [BOARD.x1, BOARD.z0],
      [BOARD.x1, BOARD.z1],
      [BOARD.x0, BOARD.z1],
    ],
    -1.6,
  ),
  face: plate(
    [
      [BOARD.x0 + 2, BOARD.z0 + 2],
      [BOARD.x1 - 2, BOARD.z0 + 2],
      [BOARD.x1 - 2, BOARD.z1 - 2],
      [BOARD.x0 + 2, BOARD.z1 - 2],
    ],
    0,
  ),
  grid: joinPaths([
    ...[-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2].map((v) => seg([GRAPH.x0, 0.05, HUB[2] + v * S], [GRAPH.x1, 0.05, HUB[2] + v * S])),
    ...Array.from({ length: 13 }, (_, i) => seg([graphX(i * 30), 0.05, BOARD.z0 + 3], [graphX(i * 30), 0.05, BOARD.z1 - 3])),
  ]),
  axis: joinPaths([seg([GRAPH.x0 - 4, 0.08, HUB[2]], [GRAPH.x1 + 4, 0.08, HUB[2]]), seg([GRAPH.x0, 0.08, BOARD.z0 + 3], [GRAPH.x0, 0.08, BOARD.z1 - 3])]),
  corners: [
    [BOARD.x0 + 4, BOARD.z0 + 4],
    [BOARD.x1 - 4, BOARD.z0 + 4],
    [BOARD.x0 + 4, BOARD.z1 - 4],
    [BOARD.x1 - 4, BOARD.z1 - 4],
  ].map(([x, z]) => at([x!, 0.1, z!])),
  rail: solid({ x: BOARD.x0 - 2, y: 2, w: BOARD.x1 - BOARD.x0 + 4, d: 3, r: 1 }, BOARD.z1 + 1, 2.4, 3, 0.4),
  railEnds: [BOARD.x0 - 1, BOARD.x1 + 1].map((x) => solid({ x: x - 1.5, y: 1, w: 3, d: 5, r: 0.6 }, BOARD.z1 - 2, 6, 3, 0.3)),
  labels: {
    theta: [0, 90, 180, 270, 360].map((t) => ({ t, at: at([graphX(t), 0.1, BOARD.z0 - 3]) })),
    y: [-2, -1, 1, 2].map((v) => ({ v, at: at([GRAPH.x0 - 6, 0.1, HUB[2] + v * S]) })),
  },
};

/** The pen carriage on the top rail at angle θ, its rod down to the pen tip at height y. */
export function penAt(theta: number, y: number) {
  const x = graphX(theta);
  const tipZ = HUB[2] + y * S;
  return {
    carriage: solid({ x: x - 4, y: 1.2, w: 8, d: 4.6, r: 1 }, BOARD.z1 + 3.4, 3.6, 3, 0.4),
    rod: seg([x, 3.5, BOARD.z1 + 3.4], [x, 3.5, tipZ + 1.4]),
    tip: at([x, 0.8, tipZ]),
    tipPoint: [x, 0.8, tipZ] as Point3,
  };
}

/** The wave drawn so far, from θ = 0 to `to`. */
export function waveD(amplitude: number, gear: Gear, to: number, depth = 0.4) {
  if (to <= 0) return "";
  const steps = Math.max(2, Math.round(to / 3));
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (to * i) / steps;
    const [x, y] = graphAt(t, amplitude * Math.sin(rad(gear * t)), depth);
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/** Screen axes of the wheel's plane (for dragging the peg) and of the crank's (for turning it). */
const minus = (a: Flat, b: Flat): Flat => [a[0] - b[0], a[1] - b[1]];
export const WHEEL_AXES = { origin: at([HUB[0], 2.4, HUB[2]]), ex: minus(at([HUB[0] + 1, 2.4, HUB[2]]), at([HUB[0], 2.4, HUB[2]])), ez: minus(at([HUB[0], 2.4, HUB[2] + 1]), at([HUB[0], 2.4, HUB[2]])) };
export const CRANK_AXES = { origin: at([CRANK[0], CRANK[1] + 1.4, CRANK[2]]), ex: minus(at([CRANK[0] + 1, CRANK[1] + 1.4, CRANK[2]]), at([CRANK[0], CRANK[1] + 1.4, CRANK[2]])), ez: minus(at([CRANK[0], CRANK[1] + 1.4, CRANK[2] + 1]), at([CRANK[0], CRANK[1] + 1.4, CRANK[2]])) };

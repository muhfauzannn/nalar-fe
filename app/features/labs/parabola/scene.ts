import {
  circleRing,
  cylinder,
  fitProjection,
  insetPlan,
  iso,
  joinPaths,
  lineOnTop,
  onTop,
  pathOf,
  planOutline,
  ring,
  sideRing,
  slabOf,
  topTicks,
  type Flat,
  type Plan,
  type Point3,
} from "../iso/iso-kit";
import { BARREL, CLIFF, FIELD, TRUNNION, TRUNNION_X } from "./model";

// The world of the lab, in kit units (x along the field, y across it, z up).
// One metre is U units. The cliff stands at x < 0, the field runs to FIELD m,
// and every flight happens in the plane y = 0.

export const U = 6;
export const WIDTH = 680;
export const HEIGHT = 360;
const AZIMUTH = 74;
const ELEVATION = 26;

const m = (metres: number) => metres * U;
export const CLIFF_Z = m(CLIFF);
export const BASE: Plan = { x: -54, y: -34, w: m(FIELD) + 76, d: 68, r: 6 };
export const BASE_H = 7;
export const FOOT_H = 4;
export const CLIFF_PLAN: Plan = { x: -50, y: -30, w: 50, d: 60, r: 3 };
export const RAIL_Y = 22;
export const PEG_Y = -24;
const TRUN: Point3 = [m(TRUNNION_X), 0, CLIFF_Z + m(TRUNNION)];
export const TRUNNION_AT = TRUN;

export const P = fitProjection(
  [
    [BASE.x, BASE.y, -BASE_H - FOOT_H],
    [BASE.x + BASE.w, BASE.y + BASE.d, -BASE_H - FOOT_H],
    [BASE.x, BASE.y + BASE.d, -BASE_H - FOOT_H],
    [BASE.x + BASE.w, BASE.y, 0],
    // headroom for the arcs the missions need (a higher one may leave the frame)
    [m(14), 0, m(14.5)],
    [BASE.x, BASE.y, CLIFF_Z + 30],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: AZIMUTH, elevation: ELEVATION },
);

export const at = (point: Point3): Flat => iso(point, P);
/** A point of the flight plane (metres) on screen. */
export const flight = (x: number, y: number): Flat => at([m(x), 0, m(y)]);
export const ground = (x: number, y = 0): Flat => at([m(x), y, 0]);

const solid = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const drum = (cx: number, cy: number, r: number, z: number, h: number, steps = 28) => cylinder(cx, cy, r, z, h, P, steps);
const seg = (a: Point3, b: Point3) => pathOf([at(a), at(b)]);

/** A disc standing in the x–z plane at depth y (a wheel, a gauge face). */
function sideDisc(center: Point3, r: number, steps = 28) {
  const [cx, cy, cz] = center;
  const points: Flat[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    points.push(at([cx + r * Math.cos(a), cy, cz + r * Math.sin(a)]));
  }
  return pathOf(points, true);
}

/** A flat plate standing in the x–z plane, as a polygon of [x, z] corners. */
function sidePlate(corners: Array<[number, number]>, y: number) {
  return pathOf(corners.map(([x, z]) => at([x, y, z])), true);
}

// ---- the base board ------------------------------------------------------------------------

const FEET = [
  [BASE.x + 12, BASE.y + 10],
  [BASE.x + BASE.w - 12, BASE.y + 10],
  [BASE.x + 12, BASE.y + BASE.d - 10],
  [BASE.x + BASE.w - 12, BASE.y + BASE.d - 10],
  [BASE.x + BASE.w / 2, BASE.y + 10],
  [BASE.x + BASE.w / 2, BASE.y + BASE.d - 10],
] as const;
const SCREWS: Array<[number, number]> = [
  [BASE.x + 6, BASE.y + 6],
  [BASE.x + BASE.w - 6, BASE.y + 6],
  [BASE.x + 6, BASE.y + BASE.d - 6],
  [BASE.x + BASE.w - 6, BASE.y + BASE.d - 6],
];
const LABEL: Plan = { x: m(FIELD) - 34, y: BASE.y + BASE.d - 13, w: 46, d: 9, r: 1.5 };

export const BASE_ART = {
  halo: solid(BASE, -BASE_H - FOOT_H, BASE_H).fill,
  feet: FEET.map(([x, y]) => drum(x, y, 5, -BASE_H - FOOT_H, FOOT_H, 18)),
  slab: solid(BASE, -BASE_H, BASE_H, 8, 1.4),
  groove: planOutline(insetPlan({ ...BASE, x: 2, w: BASE.x + BASE.w - 2 - 2 }, 4), 0, P),
  screws: SCREWS.map(([x, y]) => at([x, y, 0])),
  screwRings: joinPaths(SCREWS.map(([x, y]) => ring(x, y, 1.8, 0, P, 14))),
  label: solid(LABEL, 0, 0.7, 4),
  labelLine: planOutline(insetPlan(LABEL, 1.4), 0.7, P),
  labelRules: joinPaths([0, 1, 2].map((row) => lineOnTop([LABEL.x + 6, LABEL.y + 2.6 + row * 1.9], [LABEL.x + (row === 1 ? 28 : 38), LABEL.y + 2.6 + row * 1.9], 0.7, P))),
  labelScrews: [at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.7]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.7])],
};

// ---- the field: ruler strip, distance pegs, landing zone ----------------------------------

const RULER: Plan = { x: -1, y: BASE.y + BASE.d - 8, w: m(FIELD) + 2, d: 5, r: 1 };
const rulerTicks = topTicks(0, m(FIELD), U, 5, RULER.y + 0.2, 0.6, [1.6, 3.4], P);

export const FIELD_ART = {
  ruler: solid(RULER, 0, 0.6, 3),
  rulerMinor: rulerTicks.minor,
  rulerMajor: rulerTicks.major,
  zero: lineOnTop([0, RULER.y - 3], [0, RULER.y + RULER.d], 0.6, P),
  // the flight lane: a faint seam down the middle of the field
  lane: lineOnTop([2, -0.01], [m(FIELD), -0.01], 0, P),
  pegs: [10, 20, 30, 40].map((d) => ({
    metres: d,
    post: drum(m(d), PEG_Y, 1.3, 0, 7, 12),
    cap: drum(m(d), PEG_Y, 2, 7, 1.2, 14),
    foot: ring(m(d), PEG_Y, 2.6, 0, P, 16),
    label: at([m(d), PEG_Y, 12]),
  })),
  endStop: solid({ x: m(FIELD) + 4, y: -26, w: 5, d: 52, r: 1.5 }, 0, 9, 4, 0.6),
  endStopScrews: [at([m(FIELD) + 6.5, -20, 9]), at([m(FIELD) + 6.5, 20, 9])],
};

/** The cart's rail along the front of the field. */
const RAIL: Plan = { x: 0, y: RAIL_Y - 2, w: m(FIELD) + 2, d: 4, r: 1 };
export const RAIL_ART = {
  rail: solid(RAIL, 0, 2.2, 3, 0.4),
  railTop: lineOnTop([0.5, RAIL_Y], [m(FIELD) + 1.5, RAIL_Y], 2.2, P),
  sleepers: Array.from({ length: FIELD / 5 + 1 }, (_, i) => solid({ x: i * m(5) - 1.5 + 0.0001, y: RAIL_Y - 4.5, w: 3, d: 9, r: 0.8 }, 0, 0.9, 3)),
};

/** The cart, drawn at x = 0 and moved along the rail. */
const CART: Plan = { x: -5, y: RAIL_Y - 4, w: 10, d: 8, r: 1.2 };
export const CART_ART = {
  wheelsBack: [-3.4, 3.4].map((x) => sideDisc([x, RAIL_Y - 4.2, 2.6], 2.1, 16)),
  body: solid(CART, 2.4, 4.6, 4, 0.6),
  deck: planOutline(insetPlan(CART, 1.2), 7, P),
  wheelsFront: [-3.4, 3.4].map((x) => sideDisc([x, RAIL_Y + 4.2, 2.6], 2.1, 16)),
  hubs: [-3.4, 3.4].map((x) => at([x, RAIL_Y + 4.25, 2.6])),
  mast: seg([0, RAIL_Y, 7], [0, RAIL_Y, 13]),
  mastTip: at([0, RAIL_Y, 13]),
};

// ---- the cliff, its ladder and the gun platform ---------------------------------------------

const PLATFORM: Plan = { x: -46, y: -18, w: 42, d: 36, r: 2 };
export const CLIFF_ART = {
  rock: solid(CLIFF_PLAN, 0, CLIFF_Z, 6, 1.2),
  // strata on the face toward the field, edge to edge
  strata: joinPaths([0.22, 0.47, 0.71].map((f) => seg([0.02, CLIFF_PLAN.y + 0.5, CLIFF_Z * f], [0.02, CLIFF_PLAN.y + CLIFF_PLAN.d - 0.5, CLIFF_Z * f]))),
  strataSide: joinPaths([0.22, 0.47, 0.71].map((f) => seg([CLIFF_PLAN.x + 0.5, CLIFF_PLAN.y + CLIFF_PLAN.d + 0.02, CLIFF_Z * f], [-0.5, CLIFF_PLAN.y + CLIFF_PLAN.d + 0.02, CLIFF_Z * f]))),
  // a height scale on the cliff face: the ball starts this high
  // on the face toward the viewer, by the edge: the ball starts this high
  heightScale: joinPaths(Array.from({ length: CLIFF + 1 }, (_, i) => seg([-1.5, CLIFF_PLAN.y + CLIFF_PLAN.d + 0.05, i * U], [i % 5 === 0 ? -7 : -4.5, CLIFF_PLAN.y + CLIFF_PLAN.d + 0.05, i * U]))),
  heightSpine: seg([-1.5, CLIFF_PLAN.y + CLIFF_PLAN.d + 0.05, 0], [-1.5, CLIFF_PLAN.y + CLIFF_PLAN.d + 0.05, CLIFF_Z]),
  platform: solid(PLATFORM, CLIFF_Z, 1.6, 4, 0.5),
  platformGroove: planOutline(insetPlan(PLATFORM, 3), CLIFF_Z + 1.6, P),
  platformScrews: [
    [PLATFORM.x + 2, PLATFORM.y + 2],
    [PLATFORM.x + PLATFORM.w - 2, PLATFORM.y + 2],
    [PLATFORM.x + 2, PLATFORM.y + PLATFORM.d - 2],
    [PLATFORM.x + PLATFORM.w - 2, PLATFORM.y + PLATFORM.d - 2],
  ].map(([x, y]) => at([x!, y!, CLIFF_Z + 1.6])),
  // a ladder up the side face
  ladderRails: joinPaths([-40, -32].map((x) => seg([x, CLIFF_PLAN.y + CLIFF_PLAN.d + 1.2, 0], [x, CLIFF_PLAN.y + CLIFF_PLAN.d + 1.2, CLIFF_Z + 4]))),
  ladderRungs: joinPaths(Array.from({ length: 8 }, (_, i) => seg([-40, CLIFF_PLAN.y + CLIFF_PLAN.d + 1.2, 3 + i * 5], [-32, CLIFF_PLAN.y + CLIFF_PLAN.d + 1.2, 3 + i * 5]))),
};

// ---- the cannon ----------------------------------------------------------------------------

const [TX, , TZ] = TRUN;
const CHEEK = (y: number) =>
  sidePlate(
    [
      [TX - 11, CLIFF_Z + 3.2],
      [TX + 4.5, CLIFF_Z + 3.2],
      [TX + 4.5, TZ - 1],
      [TX + 1.6, TZ + 2.4],
      [TX - 2.2, TZ + 2.4],
      [TX - 8, CLIFF_Z + 7.4],
      [TX - 11, CLIFF_Z + 7.4],
    ],
    y,
  );
const WHEEL_R = 3.6;
const WHEELS = [TX - 7.5, TX + 1.8];
export const CANNON_ART = {
  wheelsFar: WHEELS.map((x) => ({ disc: sideDisc([x, -7.4, CLIFF_Z + WHEEL_R], WHEEL_R, 24), rim: sideDisc([x, -7.4, CLIFF_Z + WHEEL_R], WHEEL_R - 0.9, 24) })),
  cheekFar: CHEEK(-4.2),
  bed: solid({ x: TX - 11, y: -4.2, w: 15.5, d: 8.4, r: 0.6 }, CLIFF_Z + 3.2, 1.4, 3),
  trail: solid({ x: TX - 17, y: -1.6, w: 7, d: 3.2, r: 0.8 }, CLIFF_Z + 1.6, 1.8, 3, 0.4),
  cheekNear: CHEEK(4.2),
  cheekBolts: [
    [TX - 9, CLIFF_Z + 5.2],
    [TX + 2.8, CLIFF_Z + 5.2],
    [TX - 1.2, CLIFF_Z + 5.2],
  ].map(([x, z]) => at([x!, 4.25, z!])),
  axle: seg([TX - 7.5, -8.4, CLIFF_Z + WHEEL_R], [TX - 7.5, 8.4, CLIFF_Z + WHEEL_R]),
  axle2: seg([TX + 1.8, -8.4, CLIFF_Z + WHEEL_R], [TX + 1.8, 8.4, CLIFF_Z + WHEEL_R]),
  wheelsNear: WHEELS.map((x) => ({
    disc: sideDisc([x, 7.4, CLIFF_Z + WHEEL_R], WHEEL_R, 24),
    rim: sideDisc([x, 7.4, CLIFF_Z + WHEEL_R], WHEEL_R - 0.9, 24),
    spokes: joinPaths(
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return seg([x + 0.9 * Math.cos(a), 7.45, CLIFF_Z + WHEEL_R + 0.9 * Math.sin(a)], [x + (WHEEL_R - 0.9) * Math.cos(a), 7.45, CLIFF_Z + WHEEL_R + (WHEEL_R - 0.9) * Math.sin(a)]);
      }),
    ),
    hub: sideDisc([x, 7.6, CLIFF_Z + WHEEL_R], 0.9, 12),
  })),
  trunnionCap: sideDisc([TX, 4.5, TZ], 1.3, 14),
  trunnionDot: at([TX, 4.6, TZ]),
};

/** The barrel at an angle: a tapered tube with bands, rebuilt when the angle changes. */
export function barrelAt(angle: number) {
  const a = (angle * Math.PI) / 180;
  const dir: Point3 = [Math.cos(a), 0, Math.sin(a)];
  const up: Point3 = [-Math.sin(a), 0, Math.cos(a)];
  const along = (t: number): Point3 => [TX + dir[0] * t, 0, TZ + dir[2] * t];
  const ringAt = (t: number, r: number, steps = 18): Flat[] => {
    const c = along(t);
    const out: Flat[] = [];
    for (let i = 0; i < steps; i++) {
      const q = (i / steps) * Math.PI * 2;
      out.push(at([c[0] + up[0] * r * Math.cos(q), Math.sin(q) * r, c[2] + up[2] * r * Math.cos(q)]));
    }
    return out;
  };
  const length = m(BARREL);
  const back = ringAt(-3.2, 2.2);
  const front = ringAt(length, 1.55);
  const all = [...back, ...front];
  const hull = convexHull(all);
  const band = (t: number, r: number) => pathOf(ringAt(t, r), true);
  // the side that faces the light is the upper half: a soft highlight strip
  const shine = pathOf([at(along(-2.6).map((v, i) => v + (i === 2 ? 1.2 : 0)) as Point3), at(along(length - 0.4).map((v, i) => v + (i === 2 ? 0.9 : 0)) as Point3)]);
  const muzzle = at(along(length));
  return {
    body: pathOf(hull, true),
    bands: joinPaths([band(-3.2, 2.2), band(0.6, 2.05), band(length * 0.55, 1.85), band(length - 1.4, 1.75), band(length, 1.55)]),
    bore: pathOf(ringAt(length + 0.05, 0.85, 14), true),
    cascabel: at(along(-4.4)),
    shine,
    muzzle,
  };
}

/** The elevation quadrant on the near cheek: an arc with degree ticks. */
const QUAD_R = 5.6;
export const QUADRANT = {
  plate: sidePlate(
    Array.from({ length: 19 }, (_, i): [number, number] => {
      const a = ((5 + (i / 18) * 85) * Math.PI) / 180;
      return [TX + (QUAD_R + 1.6) * Math.cos(a), TZ + (QUAD_R + 1.6) * Math.sin(a)];
    }).concat([[TX, TZ]]),
    5.2,
  ),
  ticks: joinPaths(
    Array.from({ length: 18 }, (_, i) => {
      const deg = 5 + i * 5;
      const a = (deg * Math.PI) / 180;
      const inner = QUAD_R - (deg % 15 === 0 ? 1.6 : 0.8);
      return seg([TX + inner * Math.cos(a), 5.25, TZ + inner * Math.sin(a)], [TX + QUAD_R * Math.cos(a), 5.25, TZ + QUAD_R * Math.sin(a)]);
    }),
  ),
  arc: pathOf(Array.from({ length: 30 }, (_, i) => {
    const a = ((5 + (i / 29) * 85) * Math.PI) / 180;
    return at([TX + QUAD_R * Math.cos(a), 5.25, TZ + QUAD_R * Math.sin(a)]);
  })),
  pivot: at([TX, 5.3, TZ]),
};
/** The angle handle is a sight just past the muzzle: the student aims the barrel by its tip. */
export const handleAt = (angle: number) => {
  const a = (angle * Math.PI) / 180;
  const reach = m(BARREL) + 3.4;
  return at([TX + reach * Math.cos(a), 0, TZ + reach * Math.sin(a)]);
};
export const pointerAt = (angle: number) => {
  const a = (angle * Math.PI) / 180;
  return pathOf([at([TX, 5.3, TZ]), at([TX + (QUAD_R + 1.2) * Math.cos(a), 5.3, TZ + (QUAD_R + 1.2) * Math.sin(a)])]);
};
/** Screen vectors of one unit along x and z in the flight plane, at the trunnion. */
export const QUAD_AXES = { origin: at([TX, 0, TZ]), ex: minus(at([TX + 1, 0, TZ]), at([TX, 0, TZ])), ez: minus(at([TX, 0, TZ + 1]), at([TX, 0, TZ])) };

// ---- the powder: a keg and a charge column with a sliding handle -----------------------------

const COLUMN_X = -40;
const COLUMN_Y = 10;
export const COLUMN = { bottom: CLIFF_Z + 6, top: CLIFF_Z + 30 };
export const POWDER_ART = {
  keg: drum(-31, 12, 4.2, CLIFF_Z + 1.6, 7.5, 22),
  kegBands: joinPaths([2.2, 5.4].map((z) => ring(-31, 12, 4.25, CLIFF_Z + 1.6 + z, P, 22))),
  kegLid: ring(-31, 12, 3.2, CLIFF_Z + 9.1, P, 20),
  base: solid({ x: COLUMN_X - 4, y: COLUMN_Y - 4, w: 8, d: 8, r: 1 }, CLIFF_Z + 1.6, 2.4, 3, 0.5),
  column: solid({ x: COLUMN_X - 1.6, y: COLUMN_Y - 1.6, w: 3.2, d: 3.2, r: 0.6 }, CLIFF_Z + 4, 28, 3, 0.3),
  // the slot and its scale on the column's face toward the viewer
  slot: seg([COLUMN_X, COLUMN_Y + 1.65, COLUMN.bottom], [COLUMN_X, COLUMN_Y + 1.65, COLUMN.top]),
  ticks: {
    minor: joinPaths(Array.from({ length: 15 }, (_, i) => i).filter((i) => i % 7 !== 0).map((i) => {
      const z = COLUMN.bottom + (i * (COLUMN.top - COLUMN.bottom)) / 14;
      return seg([COLUMN_X - 1.55, COLUMN_Y + 1.65, z], [COLUMN_X - 0.8, COLUMN_Y + 1.65, z]);
    })),
    major: joinPaths([0, 7, 14].map((i) => {
      const z = COLUMN.bottom + (i * (COLUMN.top - COLUMN.bottom)) / 14;
      return seg([COLUMN_X - 1.55, COLUMN_Y + 1.65, z], [COLUMN_X - 0.3, COLUMN_Y + 1.65, z]);
    })),
  },
  cap: solid({ x: COLUMN_X - 2.2, y: COLUMN_Y - 2.2, w: 4.4, d: 4.4, r: 0.8 }, CLIFF_Z + 32, 1.4, 3, 0.3),
  fuse: pathOf([at([-31, 12, CLIFF_Z + 9.1]), at([-27, 9, CLIFF_Z + 10]), at([TX - 4, 1, TZ + 2.6])]),
};
export const powderHandleAt = (t: number) => at([COLUMN_X, COLUMN_Y + 2.2, COLUMN.bottom + (COLUMN.top - COLUMN.bottom) * t]);
export const POWDER_AXIS = { from: powderHandleAt(0), to: powderHandleAt(1) };

// ---- the shot rack: a 1 kg and a 5 kg ball in their cups ------------------------------------

export const RACK = {
  board: solid({ x: -44, y: -16, w: 16, d: 9, r: 1 }, CLIFF_Z + 1.6, 2.2, 3, 0.4),
  cups: [
    { mass: 1 as const, at: [-40, -11.5] as [number, number], r: 1.9 },
    { mass: 5 as const, at: [-32.5, -11.5] as [number, number], r: 3.3 },
  ].map((cup) => ({
    ...cup,
    rim: ring(cup.at[0], cup.at[1], cup.r * 0.75, CLIFF_Z + 3.8, P, 18),
    center: at([cup.at[0], cup.at[1], CLIFF_Z + 3.8 + cup.r * 0.85]),
  })),
};

// ---- the target: a ring painted on the field and a flag on a pole ----------------------------

export function targetAt(metres: number) {
  const x = m(metres);
  return {
    rings: joinPaths([U, U * 0.62, U * 0.28].map((r) => ring(x, 0, r, 0.05, P, 32))),
    zone: onTop(circleRing(x, 0, U, 32), 0.05, P, true),
    pole: seg([x, -9, 0], [x, -9, 26]),
    poleFoot: ring(x, -9, 1.4, 0, P, 14),
    flag: pathOf([at([x, -9, 26]), at([x + 9, -9, 23]), at([x, -9, 20])], true),
    top: at([x, -9, 26]),
    label: at([x, -9, 30]),
  };
}

// ---- helpers --------------------------------------------------------------------------------

function minus(a: Flat, b: Flat): Flat {
  return [a[0] - b[0], a[1] - b[1]];
}

function convexHull(points: Flat[]): Flat[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Flat[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}


import { cylinder, fitProjection, insetPlan, iso, joinPaths, lineOnTop, pathOf, planOutline, ring, sideRing, slabOf, type Flat, type Plan, type Point3 } from "../iso/iso-kit";
import { CONC, TEMP } from "./model";

// The collision reactor on its bench (kit units: x along the bench, y toward
// the viewer, z up). From left: a syringe pump on a stand feeding stock solution
// through the lid, the glass reactor on a hot plate with its thermostat knob,
// a thermometer and the catalyst basket hanging through the lid, and a rate
// gauge on a post. Particles move in the liquid in the plane y = 0.

export const WIDTH = 680;
export const HEIGHT = 360;

const BENCH: Plan = { x: -96, y: -28, w: 250, d: 56, r: 5 };
const BENCH_H = 7;
const FOOT_H = 4;
const PLATE: Plan = { x: -6, y: -22, w: 72, d: 44, r: 4 };
const PLATE_H = 9;
export const GLASS = { x0: 2, x1: 58, y0: -16, y1: 16, z0: PLATE_H, z1: 58 };
export const LIQUID_TOP = 46;
const LID: Plan = { x: 0, y: -18, w: 60, d: 36, r: 2 };
const LID_H = 4;
const LID_TOP = GLASS.z1 + LID_H;
export const KNOB: Point3 = [50, PLATE.y + PLATE.d, PLATE_H / 2];
export const KNOB_R = 3.8;
export const KNOB_SWEEP = 135;
const THERMO = { x: 46, y: -6, r: 1.3, z0: 15, z1: 80 };
export const BASKET = { x: 26, y: 0, w: 10, h: 8, down: 20, up: 47 };
const BARREL = { x0: -66, x1: -24, y: 0, z: 76, r: 5 };
const STAND_X = -46;
export const GAUGE: Point3 = [118, 0, 44];
export const GAUGE_R = 22;

export const P = fitProjection(
  [
    [BENCH.x, BENCH.y, -BENCH_H - FOOT_H],
    [BENCH.x + BENCH.w, BENCH.y + BENCH.d, -BENCH_H - FOOT_H],
    [BENCH.x, BENCH.y + BENCH.d, -BENCH_H - FOOT_H],
    [BENCH.x + BENCH.w, BENCH.y, -BENCH_H],
    [BARREL.x0 - 30, 0, BARREL.z + BARREL.r + 2],
    [THERMO.x, THERMO.y, THERMO.z1 + 3],
    [GAUGE[0] + GAUGE_R + 2, 0, GAUGE[2] + GAUGE_R + 3],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: 70, elevation: 24 },
);

export const at = (point: Point3): Flat => iso(point, P);
const solid = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const seg = (a: Point3, b: Point3) => pathOf([at(a), at(b)]);
const rad = (degrees: number) => (degrees * Math.PI) / 180;
const quad = (points: Point3[]) => pathOf(points.map(at), true);

/** A circle standing in the x–z plane at depth y (it faces the viewer). */
export function upright(center: Point3, r: number, steps = 32) {
  const [cx, cy, cz] = center;
  return pathOf(Array.from({ length: steps }, (_, i) => at([cx + r * Math.cos((i / steps) * Math.PI * 2), cy, cz + r * Math.sin((i / steps) * Math.PI * 2)])), true);
}

// ---- bench ---------------------------------------------------------------------------------------

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
const LABEL: Plan = { x: 82, y: BENCH.y + BENCH.d - 13, w: 40, d: 9, r: 1.5 };
export const BENCH_ART = {
  halo: solid(BENCH, -BENCH_H - FOOT_H, BENCH_H).fill,
  feet: FEET.map(([x, y]) => cylinder(x, y, 5, -BENCH_H - FOOT_H, FOOT_H, P, 18)),
  slab: solid(BENCH, -BENCH_H, BENCH_H, 8, 1.4),
  groove: planOutline(insetPlan(BENCH, 4), 0, P),
  screws: SCREWS.map(([x, y]) => at([x, y, 0])),
  screwRings: joinPaths(SCREWS.map(([x, y]) => ring(x, y, 1.8, 0, P, 14))),
  label: solid(LABEL, 0, 0.7, 4),
  labelRules: joinPaths([0, 1, 2].map((row) => lineOnTop([LABEL.x + 5, LABEL.y + 2.6 + row * 1.9], [LABEL.x + (row === 1 ? 22 : 32), LABEL.y + 2.6 + row * 1.9], 0.7, P))),
};

// ---- hot plate, its coil and the thermostat knob on the front -----------------------------------

const KNOB_FACE = KNOB[1] + 2.4;
export const PLATE_ART = {
  body: solid(PLATE, 0, PLATE_H, 6, 0.8),
  top: planOutline(insetPlan(PLATE, 3), PLATE_H, P),
  // the heating coil under the glass, as rings on the plate top
  coil: joinPaths([8, 13, 18].map((r) => ring(30, 0, r, PLATE_H + 0.05, P, 36))),
  vents: joinPaths([0, 1, 2, 3, 4].map((i) => seg([4 + i * 5, PLATE.y + PLATE.d, 2.5], [4 + i * 5, PLATE.y + PLATE.d, 6.5]))),
  lamp: at([36, PLATE.y + PLATE.d, PLATE_H / 2]),
  knobBack: upright([KNOB[0], KNOB[1] + 0.4, KNOB[2]], KNOB_R + 0.6, 24),
  knobFace: upright([KNOB[0], KNOB_FACE, KNOB[2]], KNOB_R, 24),
  knobKnurl: joinPaths(
    Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return seg([KNOB[0] + KNOB_R * Math.cos(a), KNOB_FACE, KNOB[2] + KNOB_R * Math.sin(a)], [KNOB[0] + (KNOB_R - 0.6) * Math.cos(a), KNOB_FACE, KNOB[2] + (KNOB_R - 0.6) * Math.sin(a)]);
    }),
  ),
  // the dial printed round the knob: one tick per 5 K, longer every 10 K
  dial: joinPaths(
    Array.from({ length: (TEMP.max - TEMP.min) / TEMP.step + 1 }, (_, i) => {
      const a = rad(-KNOB_SWEEP + (2 * KNOB_SWEEP * i * TEMP.step) / (TEMP.max - TEMP.min));
      const r0 = KNOB_R + 1.2;
      const r1 = KNOB_R + (i % 2 === 0 ? 2.6 : 1.9);
      return seg([KNOB[0] + r0 * Math.sin(a), KNOB[1] + 0.1, KNOB[2] + r0 * Math.cos(a)], [KNOB[0] + r1 * Math.sin(a), KNOB[1] + 0.1, KNOB[2] + r1 * Math.cos(a)]);
    }),
  ),
};
export const knobAngle = (temp: number) => -KNOB_SWEEP + (2 * KNOB_SWEEP * (temp - TEMP.min)) / (TEMP.max - TEMP.min);
export function knobAt(temp: number) {
  const a = rad(knobAngle(temp));
  const tip: Point3 = [KNOB[0] + (KNOB_R - 0.8) * Math.sin(a), KNOB_FACE + 0.1, KNOB[2] + (KNOB_R - 0.8) * Math.cos(a)];
  return { pointer: seg([KNOB[0], KNOB_FACE + 0.1, KNOB[2]], tip), grip: at(tip) };
}
/** The coil's glow: 0 at the coldest setting, 1 at the hottest. */
export const glowOf = (temp: number) => (temp - TEMP.min) / (TEMP.max - TEMP.min);

// ---- the glass reactor, its liquid and lid -------------------------------------------------------

const { x0, x1, y0, y1, z0, z1 } = GLASS;
export const GLASS_ART = {
  back: quad([
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y0, z1],
    [x0, y0, z1],
  ]),
  side: quad([
    [x0, y0, z0],
    [x0, y1, z0],
    [x0, y1, z1],
    [x0, y0, z1],
  ]),
  liquidBack: quad([
    [x0 + 0.6, y0 + 0.6, z0 + 0.6],
    [x1 - 0.6, y0 + 0.6, z0 + 0.6],
    [x1 - 0.6, y0 + 0.6, LIQUID_TOP],
    [x0 + 0.6, y0 + 0.6, LIQUID_TOP],
  ]),
  liquidTop: quad([
    [x0 + 0.6, y0 + 0.6, LIQUID_TOP],
    [x1 - 0.6, y0 + 0.6, LIQUID_TOP],
    [x1 - 0.6, y1 - 0.6, LIQUID_TOP],
    [x0 + 0.6, y1 - 0.6, LIQUID_TOP],
  ]),
  liquidFront: quad([
    [x0 + 0.6, y1 - 0.6, z0 + 0.6],
    [x1 - 0.6, y1 - 0.6, z0 + 0.6],
    [x1 - 0.6, y1 - 0.6, LIQUID_TOP],
    [x0 + 0.6, y1 - 0.6, LIQUID_TOP],
  ]),
  meniscus: seg([x0 + 0.6, y1 - 0.6, LIQUID_TOP], [x1 - 0.6, y1 - 0.6, LIQUID_TOP]),
  hiddenEdges: joinPaths([seg([x0, y0, z0], [x1, y0, z0]), seg([x0, y0, z0], [x0, y0, z1]), seg([x0, y0, z0], [x0, y1, z0])]),
  frontEdges: joinPaths([
    seg([x0, y1, z0], [x1, y1, z0]),
    seg([x1, y1, z0], [x1, y0, z0]),
    seg([x0, y1, z0], [x0, y1, z1]),
    seg([x1, y1, z0], [x1, y1, z1]),
    seg([x1, y0, z0], [x1, y0, z1]),
  ]),
  // a reflection streak on the front pane, and volume marks up the right edge
  shine: joinPaths([seg([x0 + 5, y1 + 0.05, z0 + 8], [x0 + 5, y1 + 0.05, z1 - 6]), seg([x0 + 7.5, y1 + 0.05, z0 + 14], [x0 + 7.5, y1 + 0.05, z1 - 14])]),
  marks: joinPaths([20, 26, 32, 38, 44, 50].map((z, i) => seg([x1 - (i % 2 ? 3 : 5), y1 + 0.05, z], [x1 - 1, y1 + 0.05, z]))),
  lid: solid(LID, z1, LID_H, 4, 0.5),
  lidScrews: [
    [LID.x + 3, LID.y + 3],
    [LID.x + LID.w - 3, LID.y + 3],
    [LID.x + 3, LID.y + LID.d - 3],
    [LID.x + LID.w - 3, LID.y + LID.d - 3],
  ].map(([x, y]) => at([x!, y!, LID_TOP])),
  ports: [cylinder(8, 0, 2.6, LID_TOP, 2.2, P, 16), cylinder(BASKET.x, BASKET.y, 2.4, LID_TOP, 1.6, P, 16), cylinder(THERMO.x, THERMO.y, 2.2, LID_TOP, 2, P, 16)],
};

/** Particles live in the liquid at y = 0: their box in kit units, and the screen axes of that plane. */
export const SWIM = { x0: x0 + 4, x1: x1 - 4, z0: z0 + 3, z1: LIQUID_TOP - 3 };
const origin = at([0, 0, 0]);
export const SWIM_AXES = { origin, ex: [at([1, 0, 0])[0] - origin[0], at([1, 0, 0])[1] - origin[1]] as Flat, ez: [at([0, 0, 1])[0] - origin[0], at([0, 0, 1])[1] - origin[1]] as Flat };
export const swimAt = (x: number, z: number): Flat => [SWIM_AXES.origin[0] + x * SWIM_AXES.ex[0] + z * SWIM_AXES.ez[0], SWIM_AXES.origin[1] + x * SWIM_AXES.ex[1] + z * SWIM_AXES.ez[1]];

// ---- the thermometer through the lid ------------------------------------------------------------

const THERMO_SCALE = { z0: LID_TOP + 3, z1: THERMO.z1 - 2 };
export const thermoZ = (temp: number) => THERMO_SCALE.z0 + ((THERMO_SCALE.z1 - THERMO_SCALE.z0) * (temp - TEMP.min)) / (TEMP.max - TEMP.min);
export const THERMO_ART = {
  inside: cylinder(THERMO.x, THERMO.y, THERMO.r, THERMO.z0, LID_TOP - THERMO.z0, P, 14),
  bulb: upright([THERMO.x, THERMO.y, THERMO.z0], 2.2, 16),
  outside: cylinder(THERMO.x, THERMO.y, THERMO.r, LID_TOP + 2, THERMO.z1 - LID_TOP - 2, P, 14),
  cap: cylinder(THERMO.x, THERMO.y, THERMO.r + 0.5, THERMO.z1, 1.6, P, 14),
  ticks: joinPaths(
    Array.from({ length: (TEMP.max - TEMP.min) / TEMP.step + 1 }, (_, i) => {
      const z = thermoZ(TEMP.min + i * TEMP.step);
      return seg([THERMO.x + THERMO.r, THERMO.y + 0.4, z], [THERMO.x + THERMO.r + (i % 2 === 0 ? 2.2 : 1.3), THERMO.y + 0.4, z]);
    }),
  ),
  safe: at([THERMO.x + THERMO.r + 3.2, THERMO.y + 0.4, 0]),
};
export function thermoColumn(temp: number) {
  const front = THERMO.y + THERMO.r * 0.7;
  return { inside: seg([THERMO.x, front, THERMO.z0 + 1.5], [THERMO.x, front, LID_TOP]), outside: seg([THERMO.x, front, LID_TOP + 2], [THERMO.x, front, thermoZ(temp)]), top: at([THERMO.x, front, thermoZ(temp)]) };
}
export const thermoMarkAt = (temp: number) => at([THERMO.x + THERMO.r + 2.6, THERMO.y + 0.4, thermoZ(temp)]);
/** The red line at the glass's limit (mission 3). */
export const thermoMark = (temp: number) => seg([THERMO.x - THERMO.r - 1.6, THERMO.y + 0.4, thermoZ(temp)], [THERMO.x + THERMO.r + 2.6, THERMO.y + 0.4, thermoZ(temp)]);

// ---- the catalyst basket on its rod -------------------------------------------------------------

export function basketAt(z: number) {
  const { x, y, w, h } = BASKET;
  const half = w / 2;
  const box: Plan = { x: x - half, y: y - half, w, d: w, r: 0.6 };
  const mesh: string[] = [];
  for (let i = 1; i < 4; i++) {
    const t = -half + (w * i) / 4;
    mesh.push(seg([x + t, y + half, z], [x + t, y + half, z + h]), seg([x - half, y + half, z + (h * i) / 4], [x + half, y + half, z + (h * i) / 4]));
    mesh.push(seg([x + half, y - half + (w * i) / 4, z], [x + half, y - half + (w * i) / 4, z + h]));
  }
  return {
    body: solid(box, z, h, 3, 0),
    mesh: joinPaths(mesh),
    rim: planOutline(box, z + h, P, 3),
    pellets: [
      [-2.5, 2, 2],
      [1, 2.5, 2.2],
      [3, 0, 2],
      [-1, -2, 2.4],
      [0, 0.5, 4],
      [-3, -0.5, 4.2],
    ].map(([dx, dy, dz]) => at([x + dx!, y + dy!, z + dz!])),
    // the rod is long enough to reach just above the lid with the basket down
    rod: seg([x, y, z + h], [x, y, z + h + LID_TOP + 4 - (BASKET.down + h)]),
    grip: at([x, y, z + h + LID_TOP + 4 - (BASKET.down + h)]),
    label: at([x - half, y + half, z + h / 2]),
  };
}

// ---- syringe pump on its stand ------------------------------------------------------------------

const B = BARREL;
const barrelRing = (x: number, r = B.r) => sideRing([x, B.y, B.z], r, "x", P, 22);
/** Where the plunger's seal sits for a concentration: more stock pushed in, more particles. */
export const sealX = (conc: number) => B.x0 + 4 + ((B.x1 - B.x0 - 10) * (conc - CONC.min)) / (CONC.max - CONC.min);
export const SYRINGE_ART = {
  foot: solid({ x: STAND_X - 10, y: -9, w: 20, d: 18, r: 2 }, 0, 3, 4, 0.5),
  post: cylinder(STAND_X, 0, 1.6, 3, B.z - 3, P, 14),
  clamp: solid({ x: STAND_X - 3, y: -B.r - 1.6, w: 6, d: B.r * 2 + 3.2, r: 1 }, B.z - B.r - 1.6, B.r * 2 + 3.2, 3, 0.4),
  barrelBack: barrelRing(B.x0),
  barrelFront: barrelRing(B.x1),
  barrelSides: joinPaths([seg([B.x0, B.y, B.z + B.r], [B.x1, B.y, B.z + B.r]), seg([B.x0, B.y, B.z - B.r], [B.x1, B.y, B.z - B.r])]),
  barrelBody: pathOf([at([B.x0, B.y, B.z + B.r]), at([B.x1, B.y, B.z + B.r]), at([B.x1, B.y, B.z - B.r]), at([B.x0, B.y, B.z - B.r])], true),
  flange: barrelRing(B.x0, B.r + 2.6),
  ticks: joinPaths(Array.from({ length: 9 }, (_, i) => seg([B.x0 + 6 + i * 4, B.y + B.r * 0.8, B.z + B.r * 0.6], [B.x0 + 6 + i * 4, B.y + B.r * 0.8, B.z + B.r * (i % 2 ? 0.2 : -0.1)]))),
  nozzle: joinPaths([seg([B.x1, B.y, B.z], [B.x1 + 4, B.y, B.z])]),
  tube: pathOf([at([B.x1 + 4, B.y, B.z]), at([0, B.y, B.z]), at([5, B.y, B.z - 2]), at([8, 0, B.z - 6]), at([8, 0, LID_TOP + 2.2])]),
};
/** The plunger's thumb at kit x back to a concentration (for dragging). */
export const concAtThumb = (thumbX: number) => CONC.min + ((thumbX + 30 - (B.x0 + 4)) * (CONC.max - CONC.min)) / (B.x1 - B.x0 - 10);
export function syringeAt(conc: number) {
  const x = sealX(conc);
  const thumb = x - 30;
  return {
    stock: pathOf([at([x, B.y, B.z + B.r - 0.6]), at([B.x1, B.y, B.z + B.r - 0.6]), at([B.x1, B.y, B.z - B.r + 0.6]), at([x, B.y, B.z - B.r + 0.6])], true),
    seal: barrelRing(x, B.r - 0.4),
    rod: seg([thumb, B.y, B.z], [x, B.y, B.z]),
    thumb: barrelRing(thumb, B.r + 1.4),
    thumbBack: barrelRing(thumb - 1.6, B.r + 1.4),
    grip: at([thumb - 0.8, B.y, B.z]),
  };
}
/** Dragging the plunger: the screen direction of +x along the barrel. */
export const PLUNGER_AXIS = { origin: at([0, B.y, B.z]), ex: [at([1, B.y, B.z])[0] - at([0, B.y, B.z])[0], at([1, B.y, B.z])[1] - at([0, B.y, B.z])[1]] as Flat };

// ---- the rate gauge ----------------------------------------------------------------------------

/** Rate on a log scale: ¼× at the left stop, 32× at the right, 34° per doubling. */
export const GAUGE_RANGE = { min: -2, max: 5 } as const;
const GAUGE_SWEEP = 120;
export const gaugeAngle = (rate: number) => {
  const octave = Math.min(GAUGE_RANGE.max, Math.max(GAUGE_RANGE.min, Math.log2(Math.max(rate, 1e-3))));
  return -GAUGE_SWEEP + (2 * GAUGE_SWEEP * (octave - GAUGE_RANGE.min)) / (GAUGE_RANGE.max - GAUGE_RANGE.min);
};
const onDial = (angle: number, r: number, dy = 2.2): Point3 => [GAUGE[0] + r * Math.sin(rad(angle)), GAUGE[1] + dy, GAUGE[2] + r * Math.cos(rad(angle))];
export const GAUGE_ART = {
  foot: solid({ x: GAUGE[0] - 12, y: -10, w: 24, d: 20, r: 2 }, 0, 3, 4, 0.5),
  post: solid({ x: GAUGE[0] - 2.5, y: -2.5, w: 5, d: 5, r: 1 }, 3, GAUGE[2] - GAUGE_R - 1, 3, 0.4),
  case: upright([GAUGE[0], GAUGE[1], GAUGE[2]], GAUGE_R + 2, 48),
  bezel: upright([GAUGE[0], GAUGE[1] + 1.4, GAUGE[2]], GAUGE_R + 1, 48),
  face: upright([GAUGE[0], GAUGE[1] + 1.8, GAUGE[2]], GAUGE_R - 0.6, 48),
  // the target zone of the current mission is drawn separately (gaugeBand)
  ticks: joinPaths(
    Array.from({ length: (GAUGE_RANGE.max - GAUGE_RANGE.min) * 2 + 1 }, (_, i) => {
      const a = -GAUGE_SWEEP + (2 * GAUGE_SWEEP * i) / ((GAUGE_RANGE.max - GAUGE_RANGE.min) * 2);
      return seg(onDial(a, GAUGE_R - (i % 2 === 0 ? 5 : 3.4)), onDial(a, GAUGE_R - 2));
    }),
  ),
  arc: pathOf(Array.from({ length: 41 }, (_, i) => at(onDial(-GAUGE_SWEEP + (2 * GAUGE_SWEEP * i) / 40, GAUGE_R - 2)))),
  labels: [-2, -1, 0, 1, 2, 3, 4, 5].map((octave) => ({ octave, at: at(onDial(gaugeAngle(2 ** octave), GAUGE_R - 9)) })),
  hub: upright([GAUGE[0], GAUGE[1] + 2.6, GAUGE[2]], 2.2, 16),
  screws: [45, 135, 225, 315].map((a) => at(onDial(a, GAUGE_R + 1, 1.5))),
  // the probe cable from the lid to the back of the gauge
  cable: pathOf([at([THERMO.x + 6, -10, LID_TOP + 1]), at([THERMO.x + 6, -10, LID_TOP + 6]), at([GAUGE[0] - 16, -3, LID_TOP + 6]), at([GAUGE[0] - 16, -3, GAUGE[2] + 6])]),
  cableEnds: [at([THERMO.x + 6, -10, LID_TOP + 1]), at([GAUGE[0] - 16, -3, GAUGE[2] + 6])],
};
export function gaugeBand(from: number, to: number) {
  const a0 = gaugeAngle(from);
  const a1 = gaugeAngle(to);
  const steps = 16;
  const outer = Array.from({ length: steps + 1 }, (_, i) => at(onDial(a0 + ((a1 - a0) * i) / steps, GAUGE_R - 2, 2)));
  const inner = Array.from({ length: steps + 1 }, (_, i) => at(onDial(a1 - ((a1 - a0) * i) / steps, GAUGE_R - 5.5, 2)));
  return pathOf([...outer, ...inner], true);
}
export function needleAt(rate: number) {
  const a = gaugeAngle(rate);
  return { needle: pathOf([at(onDial(a + 180, 4, 2.8)), at(onDial(a, GAUGE_R - 4, 2.8))]), tip: at(onDial(a, GAUGE_R - 4, 2.8)) };
}
export const GAUGE_CENTER = at([GAUGE[0], GAUGE[1] + 2.6, GAUGE[2]]);
export const GAUGE_READOUT = at([GAUGE[0], GAUGE[1] + 2, GAUGE[2] - GAUGE_R * 0.45]);

/** Screen axes of the knob's plane, for turning it. */
const KNOB_ORIGIN = at([KNOB[0], KNOB_FACE, KNOB[2]]);
export const KNOB_AXES = { origin: KNOB_ORIGIN, ex: [at([KNOB[0] + 1, KNOB_FACE, KNOB[2]])[0] - KNOB_ORIGIN[0], at([KNOB[0] + 1, KNOB_FACE, KNOB[2]])[1] - KNOB_ORIGIN[1]] as Flat, ez: [at([KNOB[0], KNOB_FACE, KNOB[2] + 1])[0] - KNOB_ORIGIN[0], at([KNOB[0], KNOB_FACE, KNOB[2] + 1])[1] - KNOB_ORIGIN[1]] as Flat };
export const KNOB_CENTER = KNOB_ORIGIN;

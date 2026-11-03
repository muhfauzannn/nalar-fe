import { cylinder, fitProjection, insetPlan, iso, joinPaths, lineOnTop, pathOf, planOutline, ring, sideRing, slabOf, type Flat, type Plan, type Point3 } from "../iso/iso-kit";
import { SALT } from "./model";

// A school microscope on the left (kit units: x right, y toward the viewer, z
// up) with a dropper of salt solution over its slide, and on the right what you
// see through the eyepiece: a round field with the cell, drawn flat. The
// microscope is fitted into the left part of the card; the field fills the rest.

export const WIDTH = 680;
export const HEIGHT = 360;
const LEFT_W = 250;

/** The field of view, in card pixels. */
export const VIEW = { cx: 476, cy: 180, r: 150 };

const BASE: Plan = { x: -30, y: -24, w: 60, d: 46, r: 6 };
const BASE_H = 8;
const PILLAR: Plan = { x: -7, y: -22, w: 14, d: 10, r: 2 };
const STAGE: Plan = { x: -24, y: -14, w: 48, d: 32, r: 2 };
const STAGE_Z = 40;
const STAGE_H = 4;
const SLIDE: Plan = { x: -20, y: -3, w: 40, d: 12, r: 0.6 };
const SLIDE_Z = STAGE_Z + STAGE_H;
const AXIS: [number, number] = [0, 3];
export const PIPETTE = { x: 13, y: 3, tip: SLIDE_Z + 3, z0: SLIDE_Z + 9, z1: SLIDE_Z + 42, bulb: 12, r: 2.2 };

export const P = (() => {
  const fit = fitProjection(
    [
      [BASE.x, BASE.y, 0],
      [BASE.x + BASE.w, BASE.y + BASE.d, 0],
      [BASE.x, BASE.y + BASE.d, 0],
      [BASE.x + BASE.w, BASE.y, 0],
      [0, -20, 104],
      [PIPETTE.x + 4, PIPETTE.y, PIPETTE.z1 + PIPETTE.bulb + 2],
      [BASE.x, BASE.y, -4],
    ],
    LEFT_W,
    HEIGHT,
    { pad: 18, azimuth: 58, elevation: 22 },
  );
  return { ...fit, origin: [fit.origin[0] + 6, fit.origin[1]] as Flat };
})();

export const at = (point: Point3): Flat => iso(point, P);
const solid = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const seg = (a: Point3, b: Point3) => pathOf([at(a), at(b)]);
const tube = (r: number, z: number, h: number, steps = 20) => cylinder(AXIS[0], AXIS[1], r, z, h, P, steps);

// ---- the microscope ----------------------------------------------------------------------------

export const SCOPE_ART = {
  halo: solid(BASE, -3, BASE_H).fill,
  feet: [
    [BASE.x + 7, BASE.y + 7],
    [BASE.x + BASE.w - 7, BASE.y + 7],
    [BASE.x + 7, BASE.y + BASE.d - 7],
    [BASE.x + BASE.w - 7, BASE.y + BASE.d - 7],
  ].map(([x, y]) => cylinder(x!, y!, 3.5, -3, 3, P, 14)),
  base: solid(BASE, 0, BASE_H, 8, 1.2),
  groove: planOutline(insetPlan(BASE, 3.5), BASE_H, P),
  plate: solid({ x: 6, y: BASE.y + BASE.d - 12, w: 18, d: 7, r: 1 }, BASE_H, 0.6, 3),
  plateRules: joinPaths([0, 1, 2].map((i) => lineOnTop([9, BASE.y + BASE.d - 10.4 + i * 1.7], [i === 1 ? 16 : 21, BASE.y + BASE.d - 10.4 + i * 1.7], BASE_H + 0.6, P))),
  lamp: tube(5, BASE_H, 4, 20),
  lampGlass: ring(AXIS[0], AXIS[1], 3.4, BASE_H + 4.05, P, 20),
  pillar: solid(PILLAR, BASE_H, 88, 4, 0.6),
  pillarSeam: joinPaths([seg([PILLAR.x + PILLAR.w, PILLAR.y + PILLAR.d, STAGE_Z - 6], [PILLAR.x + PILLAR.w, PILLAR.y + PILLAR.d, STAGE_Z - 16])]),
  knobs: [sideRing([PILLAR.x + PILLAR.w + 2.5, -16, 30], 5.5, "x", P, 24), sideRing([PILLAR.x + PILLAR.w + 4.5, -16, 30], 5.5, "x", P, 24), sideRing([PILLAR.x + PILLAR.w + 5.5, -16, 30], 3, "x", P, 18)],
  knobEdge: joinPaths([seg([PILLAR.x + PILLAR.w + 2.5, -16, 35.5], [PILLAR.x + PILLAR.w + 4.5, -16, 35.5]), seg([PILLAR.x + PILLAR.w + 2.5, -16, 24.5], [PILLAR.x + PILLAR.w + 4.5, -16, 24.5])]),
  stage: solid(STAGE, STAGE_Z, STAGE_H, 4, 0.5),
  stageHole: ring(AXIS[0], AXIS[1], 3, SLIDE_Z + 0.02, P, 18),
  clips: [-15, 15].map((x) => solid({ x: x - 2, y: -6, w: 4, d: 7, r: 0.8 }, SLIDE_Z + 0.6, 0.8, 3)),
  clipScrews: [-15, 15].map((x) => at([x, -4.5, SLIDE_Z + 1.4])),
  slide: solid(SLIDE, SLIDE_Z, 0.6, 3),
  drop: ring(AXIS[0], AXIS[1] + 1, 4.2, SLIDE_Z + 0.7, P, 22),
  arm: solid({ x: -6, y: -20, w: 12, d: 15, r: 3 }, 70, 18, 4, 0.6),
  nose: tube(7.5, 62, 4, 24),
  objective: tube(3.6, SLIDE_Z + 5, 62 - SLIDE_Z - 5, 18),
  objectiveBand: ring(AXIS[0], AXIS[1], 3.62, 56, P, 18),
  objectiveSide: [cylinder(5, -3, 2.6, 56, 6, P, 14), cylinder(-4, -4, 2.6, 57, 5, P, 14)],
  body: tube(5, 66, 30, 22),
  bodyBand: ring(AXIS[0], AXIS[1], 5.02, 82, P, 22),
  eyepiece: tube(3.8, 96, 8, 18),
  eyeTop: at([AXIS[0], AXIS[1], 104]),
};

// ---- the dropper ---------------------------------------------------------------------------------

const { x: px, y: py, r: pr } = PIPETTE;
/** Where the scale ring sits on the dropper for a salt level. */
export const ringZ = (salt: number) => PIPETTE.z0 + 3 + ((PIPETTE.z1 - PIPETTE.z0 - 6) * (salt - SALT.min)) / (SALT.max - SALT.min);
export const saltAtZ = (z: number) => SALT.min + ((z - PIPETTE.z0 - 3) * (SALT.max - SALT.min)) / (PIPETTE.z1 - PIPETTE.z0 - 6);
export const PIPETTE_ART = {
  tip: pathOf([at([px - 0.5, py, PIPETTE.tip]), at([px - pr, py, PIPETTE.z0]), at([px + pr, py, PIPETTE.z0]), at([px + 0.5, py, PIPETTE.tip])], true),
  body: cylinder(px, py, pr, PIPETTE.z0, PIPETTE.z1 - PIPETTE.z0, P, 16),
  collar: cylinder(px, py, pr + 0.7, PIPETTE.z1, 2, P, 16),
  bulb: cylinder(px, py, pr + 1.6, PIPETTE.z1 + 2, PIPETTE.bulb - 3, P, 18),
  bulbTop: cylinder(px, py, pr + 1, PIPETTE.z1 + PIPETTE.bulb - 1, 2, P, 16),
  ticks: joinPaths(
    Array.from({ length: 13 }, (_, i) => {
      const z = ringZ((SALT.max * i) / 12);
      return seg([px - pr * 0.4, py + pr, z], [px + (i % 4 === 0 ? 1.2 : 0.4), py + pr, z]);
    }),
  ),
  labels: [0, 1, 2, 3].map((salt) => ({ salt, at: at([px - pr - 1, py + pr, ringZ(salt)]) })),
  dropAt: (t: number) => at([px, py, PIPETTE.tip - t * (PIPETTE.tip - SLIDE_Z - 0.8)]),
};
export function ringAt(salt: number) {
  const z = ringZ(salt);
  return { band: cylinder(px, py, pr + 0.9, z - 1, 2, P, 16), grip: at([px, py + pr + 0.9, z]) };
}
/** Dragging the ring: screen direction of +z along the dropper. */
export const RING_AXIS = { origin: at([px, py, 0]), ez: [at([px, py, 1])[0] - at([px, py, 0])[0], at([px, py, 1])[1] - at([px, py, 0])[1]] as Flat };

// ---- the light from the eyepiece to the field --------------------------------------------------

export const CONE = (() => {
  const [ex, ey] = SCOPE_ART.eyeTop;
  const dx = VIEW.cx - ex;
  const dy = VIEW.cy - ey;
  const d = Math.hypot(dx, dy);
  // the two tangents from the eyepiece to the field's rim
  const a = Math.atan2(dy, dx);
  const spread = Math.asin(Math.min(1, VIEW.r / d));
  const tangent = (sign: number): Flat => {
    const b = a + sign * spread;
    const len = Math.sqrt(Math.max(0, d * d - VIEW.r * VIEW.r));
    return [ex + Math.cos(b) * len, ey + Math.sin(b) * len];
  };
  return { from: [ex, ey] as Flat, top: tangent(-1), bottom: tangent(1) };
})();

// ---- what lies in the field ----------------------------------------------------------------------

/** A fixed scatter of points in the unit disc (seeded, so it never jumps). */
export function scatter(count: number, seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: count }, () => {
    const r = Math.sqrt(rnd());
    const a = rnd() * Math.PI * 2;
    return [r * Math.cos(a), r * Math.sin(a)] as Flat;
  });
}

/** A red blood cell's outline: round, with crenation bumps when it has shrunk. */
export function bloodOutline(radius: number, bumps: number) {
  const steps = 96;
  return pathOf(
    Array.from({ length: steps }, (_, i) => {
      const a = (i / steps) * Math.PI * 2;
      const r = radius * (1 + bumps * Math.max(0, Math.sin(a * 11)) ** 2 - bumps * 0.3);
      return [VIEW.cx + r * Math.cos(a), VIEW.cy + r * 0.92 * Math.sin(a)] as Flat;
    }),
    true,
  );
}

/** A rounded rectangle centred on (cx, cy). */
export function roundRect(cx: number, cy: number, w: number, h: number, r: number) {
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  return `M${(x0 + rr).toFixed(1)} ${y0.toFixed(1)}H${(x0 + w - rr).toFixed(1)}A${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${(x0 + w).toFixed(1)} ${(y0 + rr).toFixed(1)}V${(y0 + h - rr).toFixed(1)}A${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${(x0 + w - rr).toFixed(1)} ${(y0 + h).toFixed(1)}H${(x0 + rr).toFixed(1)}A${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${x0.toFixed(1)} ${(y0 + h - rr).toFixed(1)}V${(y0 + rr).toFixed(1)}A${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${(x0 + rr).toFixed(1)} ${y0.toFixed(1)}Z`;
}

/** Onion cells tile the field: the centre cell and its neighbours, all in the same drop. */
export const ONION = { w: 190, h: 96, wall: 5 };
export const ONION_CELLS: Flat[] = [-1, 0, 1].flatMap((row) => [-1, 0, 1, 2].map((col) => [VIEW.cx + (col - 0.5 + (row === 0 ? 0.5 : 0)) * ONION.w, VIEW.cy + row * ONION.h] as Flat));

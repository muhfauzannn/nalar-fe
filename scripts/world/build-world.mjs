// Builds public/game/world.glb: every model of the 3D world, made in code with
// the anatomy-game kit (game-kit.mjs), after the concept art in
// docs/world-concept/: smooth storybook buildings in light stone with shingled
// lavender roofs, glowing windows, gold trim, soft trees. Baked vertex colours,
// no textures. Node names are the ones app/features/lms/world3d asks for.
//
//   node scripts/world/build-world.mjs
//
// Sizes follow the scene's scales (buildings 1–4 units tall before the scene
// scales them); doors face +z.
import * as THREE from "three";

import * as K from "./game-kit.mjs";

const { part, box, drum, PAL } = K;

// ---- small helpers ------------------------------------------------------------------------

const scaled = (parts, s) => parts.flat().map((p) => ({ ...p, geometry: p.geometry.clone().scale(s, s, s) }));
const at = (parts, v) => K.move(parts.flat(), v);
/** Builds parts facing +z at local [x, y, depth], then turns them onto another face. */
const onSide = (parts, ry) => K.turn(parts.flat(), ry);
const ROOF_WARM = ["#e09868", "#a55a36"];
const RED = ["#ff8e86", "#d24f4f"];
const HAY = ["#ffe29a", "#d9a441"];
// Light dressed stone, as in the concept art: warm-lilac highlights, cool shade.
const STONE = ["#f4effa", "#cfc6e2"];
const STONE_TRIM = ["#d9d2ea", "#a59dc2"];
const ROOF_BLUE = ["#9aa7ff", "#4b55c9"];
const SAND = ["#f1d9a4", "#cfa86a"];

function flagParts(pivot, ramp = ["#5fe3ad", "#22a877"], w = 0.55, h = 0.3) {
  const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(w, -0.02 * w), new THREE.Vector2(w * 0.8, -h / 2), new THREE.Vector2(w, -h), new THREE.Vector2(0, -h)]);
  return [part(new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false }), { ramp, at: pivot, ao: false })];
}

function lantern(x, z, y0 = 0, h = 0.85) {
  return [
    part(drum(0.035, 0.045, h, { seg: 8 }), { ramp: PAL.woodDark, at: [x, y0, z] }),
    part(box(0.16, 0.2, 0.16, 0.04), { color: PAL.glow, mat: "glow", at: [x, y0 + h, z] }),
    part(drum(0.02, 0.13, 0.08, { seg: 4 }), { ramp: PAL.ink, at: [x, y0 + h + 0.2, z], rot: [0, Math.PI / 4, 0] }),
  ];
}

/** A lantern on a short stone pillar, as by the concept's steps. */
function pillarLantern(x, z, y0 = 0, s = 1) {
  return [
    part(box(0.2 * s, 0.4 * s, 0.2 * s, 0.03), { ramp: STONE_TRIM, at: [x, y0, z] }),
    part(box(0.26 * s, 0.05 * s, 0.26 * s, 0.02), { ramp: STONE, at: [x, y0 + 0.4 * s, z] }),
    part(box(0.13 * s, 0.17 * s, 0.13 * s, 0.03), { color: PAL.glow, mat: "glow", at: [x, y0 + 0.45 * s, z] }),
    part(drum(0.015, 0.11 * s, 0.07 * s, { seg: 4 }), { ramp: PAL.ink, at: [x, y0 + 0.62 * s, z], rot: [0, Math.PI / 4, 0] }),
  ];
}

function barrel(x, z, y0 = 0, s = 1) {
  return [
    part(K.lathe([[0, 0], [0.16 * s, 0], [0.19 * s, 0.18 * s], [0.16 * s, 0.36 * s], [0, 0.36 * s]], 14), { ramp: PAL.wood, at: [x, y0, z] }),
    ...[0.06, 0.3].map((y) => part(new THREE.TorusGeometry(0.18 * s, 0.012, 5, 18).rotateX(Math.PI / 2), { color: PAL.ink, at: [x, y0 + y * s, z] })),
  ];
}

function crates(x, z, y0 = 0, ry = 0.3) {
  return [
    part(box(0.32, 0.28, 0.32, 0.04), { ramp: PAL.wood, at: [x, y0, z], rot: [0, ry, 0] }),
    part(box(0.24, 0.2, 0.24, 0.03), { ramp: PAL.woodDark, at: [x, y0 + 0.28, z], rot: [0, -ry, 0] }),
  ];
}

function flowerBox(x, y, z, w = 0.46, seed = 1) {
  return [
    part(box(w, 0.12, 0.16, 0.03), { ramp: PAL.wood, at: [x, y, z] }),
    ...[0, 1, 2, 3].map((i) => part(K.blob(0.06, seed * 9 + i, { detail: 1 }), { ramp: i % 2 ? ["#ffc2e0", "#e86aa6"] : PAL.leaf, at: [x - w * 0.35 + i * w * 0.23, y + 0.15, z] })),
  ];
}

/** A clay pot with a round plant. */
function pot(x, z, y0 = 0, s = 1, seed = 1) {
  return [
    part(K.lathe([[0, 0], [0.07 * s, 0], [0.09 * s, 0.12 * s], [0.1 * s, 0.14 * s], [0, 0.14 * s]], 12), { ramp: ROOF_WARM, at: [x, y0, z] }),
    part(K.blob(0.1 * s, seed, { detail: 1 }), { ramp: PAL.leaf, at: [x, y0 + 0.2 * s, z] }),
  ];
}

function bush(x, z, r = 0.26, seed = 1) {
  return [part(K.blob(r, seed, { detail: 2, squash: 0.8, wobble: 0.08 }), { ramp: PAL.leaf, at: [x, r * 0.55, z] })];
}

/** Corner quoins up a vertical edge (alternating long and short stones), facing +z. */
function quoins(x, y0, h, z, size = 0.2) {
  const out = [];
  for (let y = y0 + size * 0.2, i = 0; y < y0 + h - size * 0.6; y += size * 1.05, i++) {
    out.push(part(box(i % 2 ? size * 1.5 : size, size * 0.9, 0.05, 0.02), { ramp: STONE_TRIM, at: [x, y, z] }));
  }
  return out;
}

/** Steps up to a door: n treads, each narrower and further out. */
function steps(x, z, y0, w, n = 3, rise = 0.07, run = 0.16) {
  return Array.from({ length: n }, (_, i) => part(box(w + (n - 1 - i) * 0.1, rise, run + 0.04, 0.02), { ramp: STONE, at: [x, y0 - rise * (i + 1), z + run * (i + 0.5)] }));
}

/** A square pyramid roof with tiled courses, a gold finial and a ring. */
function pyramidRoof(size, h, ramp, y, x = 0, z = 0) {
  return [
    part(K.spire(size * 0.72, h, { seg: 4, flare: 0.16, rows: 4, curve: 1.15 }), { ramp, at: [x, y, z], rot: [0, Math.PI / 4, 0] }),
    part(K.sphere(size * 0.09, 12), { ramp: PAL.gold, at: [x, y + h + size * 0.04, z] }),
  ];
}

// ---- castle: the assignment hall (Balai), the hero ---------------------------------------
// Concept: a stone academy with steep shingled lavender roofs, a cross-gabled front
// with a tall arched door, a square tower with a tiled pyramid roof and a mint flag.
// ground: plinth, base course, three steps, two pillar lanterns · nave: stone walls,
// quoins, base band, side gable ends · front wing: protruding porch block, its own
// shingled gable, round window, door, upper arched window · roof: shingled main roof
// along x, ridge, chimney · tower: square shaft, quoins, belt, cornice, three windows,
// pyramid roof, finial, pole, flag (moves) · life: bushes, pots, rocks, barrel, crates.
function castle() {
  const y0 = 0.22, W = 2.1, D = 1.4, H = 1.4, front = D / 2, eave = y0 + H;
  const tx = 1.15, tz = 0.25, tw = 0.72, tH = 2.7;
  const flagPivot = [tx, y0 + tH + 1.55, tz];
  const wing = { w: 0.9, d: 0.4, h: H + 0.15 };
  const parts = [
    // ground
    part(box(W + 0.75, y0, D + 0.9, 0.06), { ramp: STONE_TRIM, at: [0.15, 0, 0.15] }),
    ...steps(-0.2, front + wing.d + 0.02, y0, 0.86),
    ...pillarLantern(-0.78, front + wing.d + 0.3, 0),
    ...pillarLantern(0.38, front + wing.d + 0.3, 0),
    // nave
    part(box(W, H, D, 0.08), { ramp: STONE, at: [0, y0, 0] }),
    part(box(W + 0.06, 0.2, D + 0.06, 0.04), { ramp: STONE_TRIM, at: [0, y0, 0] }),
    part(box(W + 0.08, 0.1, D + 0.08, 0.03), { ramp: STONE_TRIM, at: [0, eave - 0.1, 0] }),
    ...quoins(-W / 2 + 0.1, y0, H, front + 0.03),
    ...[-1, 1].map((sx) => part(K.gableEnd(D - 0.04, 0.95, 0.12), { ramp: STONE, at: [sx * (W / 2 - 0.06), eave, 0], rot: [0, Math.PI / 2, 0] })),
    // roof: shingled, ridge along x, deep overhang
    part(K.gable(D, W, 0.95, { overhang: 0.24, thick: 0.16, rows: 5 }), { ramp: PAL.roof, at: [0, eave + 0.02, 0], rot: [0, Math.PI / 2, 0] }),
    part(box(0.32, 0.9, 0.32, 0.05), { ramp: STONE_TRIM, at: [-0.6, eave + 0.3, -0.2] }),
    part(box(0.42, 0.08, 0.42, 0.03), { ramp: STONE, at: [-0.6, eave + 1.2, -0.2] }),
    part(box(0.2, 0.05, 0.2, 0.02), { color: PAL.ink, at: [-0.6, eave + 1.28, -0.2] }),
    // front wing (porch block) with its own gable facing +z
    part(box(wing.w, wing.h, wing.d + 0.1, 0.06), { ramp: STONE, at: [-0.2, y0, front + wing.d / 2 - 0.05] }),
    part(K.gableEnd(wing.w - 0.02, 0.7, 0.12), { ramp: STONE, at: [-0.2, y0 + wing.h, front + wing.d - 0.06] }),
    part(K.gable(wing.w, wing.d + 0.5, 0.7, { overhang: 0.14, thick: 0.13, rows: 4 }), { ramp: PAL.roof, at: [-0.2, y0 + wing.h + 0.02, front + 0.2] }),
    ...quoins(-0.2 - wing.w / 2 + 0.08, y0, wing.h, front + wing.d + 0.01, 0.16),
    ...quoins(-0.2 + wing.w / 2 - 0.08, y0, wing.h, front + wing.d + 0.01, 0.16),
    ...K.doorParts(0.5, 0.88, { at: [-0.2, y0, front + wing.d + 0.01] }),
    ...K.windowParts(0.26, 0.4, { at: [-0.2, y0 + 1.08, front + wing.d + 0.01] }),
    part(drum(0.12, 0.12, 0.04, { seg: 18 }), { color: PAL.glow, mat: "glow", at: [-0.2, y0 + wing.h + 0.3, front + wing.d - 0.02], rot: [Math.PI / 2, 0, 0] }),
    part(new THREE.TorusGeometry(0.135, 0.035, 8, 22), { ramp: PAL.gold, at: [-0.2, y0 + wing.h + 0.3, front + wing.d + 0.01] }),
    // nave windows: front left, sides, back
    ...K.windowParts(0.3, 0.5, { at: [-0.85, y0 + 0.45, front + 0.02] }),
    ...[-0.35, 0.35].flatMap((zz) => onSide(K.windowParts(0.28, 0.48, { at: [-zz, y0 + 0.45, W / 2 + 0.02] }), -Math.PI / 2)),
    ...[-0.6, 0, 0.6].flatMap((x) => onSide(K.windowParts(0.28, 0.46, { at: [x, y0 + 0.45, front + 0.02] }), Math.PI)),
    // tower
    part(box(tw, tH, tw, 0.06), { ramp: STONE, at: [tx, y0, tz] }),
    part(box(tw + 0.08, 0.22, tw + 0.08, 0.04), { ramp: STONE_TRIM, at: [tx, y0, tz] }),
    part(box(tw + 0.06, 0.09, tw + 0.06, 0.03), { ramp: STONE_TRIM, at: [tx, y0 + tH * 0.5, tz] }),
    part(box(tw + 0.14, 0.12, tw + 0.14, 0.04), { ramp: STONE_TRIM, at: [tx, y0 + tH - 0.06, tz] }),
    ...quoins(tx - tw / 2 + 0.07, y0 + 0.22, tH - 0.3, tz + tw / 2 + 0.02, 0.17),
    ...quoins(tx + tw / 2 - 0.07, y0 + 0.22, tH - 0.3, tz + tw / 2 + 0.02, 0.17),
    ...[0.32, 0.6, 0.82].flatMap((k, i) => K.windowParts(i === 2 ? 0.22 : 0.2, i === 2 ? 0.34 : 0.32, { at: [tx, y0 + tH * k, tz + tw / 2 + 0.01] })),
    ...onSide(K.windowParts(0.2, 0.32, { at: [-tz, y0 + tH * 0.82, tx + tw / 2 + 0.01] }), Math.PI / 2),
    ...pyramidRoof(tw + 0.1, 1.2, PAL.roof, y0 + tH + 0.06, tx, tz),
    part(drum(0.022, 0.022, 0.62, { seg: 6 }), { ramp: PAL.metal, at: [tx, y0 + tH + 1.3, tz] }),
    // life
    ...bush(-1.1, front + 0.35, 0.22, 20),
    ...bush(0.75, front + 0.75, 0.2, 21),
    ...bush(-1.3, -0.4, 0.24, 22),
    ...pot(0.2, front + 0.55, y0, 1, 23),
    ...pot(-0.62, front + 0.55, y0, 1, 24),
    part(K.rock(0.16, 25), { ramp: STONE_TRIM, at: [1.6, 0, 0.95] }),
    ...barrel(1.6, -0.4, y0),
    ...crates(1.55, -0.85, y0),
  ];
  const s = 0.66;
  return K.node("castle", scaled(parts, s), { children: [{ name: "flag", pivot: flagPivot.map((v) => v * s), parts: scaled(flagParts(flagPivot), s) }], reach: 0.3 });
}

// ---- towerA: a hall not in focus (a round storybook tower) ---------------------------------
function towerA() {
  const r = 0.42, h = 1.55, y0 = 0.16;
  const pivot = [0, y0 + h + 1.3, 0];
  const parts = [
    part(drum(0.62, 0.66, y0, { seg: 20 }), { ramp: STONE_TRIM }),
    part(drum(r * 0.92, r * 1.06, h, { seg: 20 }), { ramp: STONE, at: [0, y0, 0] }),
    part(drum(r * 1.12, r * 1.14, 0.16, { seg: 20 }), { ramp: STONE_TRIM, at: [0, y0, 0] }),
    part(drum(r * 1.04, r * 1.04, 0.07, { seg: 20 }), { ramp: STONE_TRIM, at: [0, y0 + h * 0.52, 0] }),
    part(drum(r * 1.1, r * 0.98, 0.1, { seg: 20 }), { ramp: STONE_TRIM, at: [0, y0 + h - 0.04, 0] }),
    part(K.spire(r * 1.08, 1.05, { seg: 20, flare: 0.22, rows: 4 }), { ramp: PAL.roof, at: [0, y0 + h + 0.06, 0] }),
    part(K.sphere(0.07, 12), { ramp: PAL.gold, at: [0, y0 + h + 1.13, 0] }),
    part(drum(0.02, 0.02, 0.36, { seg: 6 }), { ramp: PAL.metal, at: [0, y0 + h + 1.14, 0] }),
    ...K.doorParts(0.3, 0.52, { at: [0, y0, r * 1.02] }),
    ...steps(0, r * 1.1, y0, 0.36, 2, 0.08, 0.14),
    ...[0.48, 0.78].flatMap((k) => K.windowParts(0.17, 0.28, { at: [0, y0 + h * k, r * 0.95] })),
    ...onSide(K.windowParts(0.16, 0.26, { at: [0, y0 + h * 0.62, r * 0.96] }), Math.PI / 2),
    ...onSide(K.windowParts(0.16, 0.26, { at: [0, y0 + h * 0.62, r * 0.96] }), -Math.PI / 2),
    ...bush(0.48, 0.25, 0.15, 31),
    ...bush(-0.45, 0.3, 0.13, 32),
    ...at(K.pine(0.7, 33), [-0.5, 0, -0.35]),
  ];
  return K.node("towerA", parts, { children: [{ name: "flag", pivot, parts: flagParts(pivot, ["#5fe3ad", "#22a877"], 0.4, 0.22) }], reach: 0.3 });
}

// ---- church: the library (a domed reading hall) --------------------------------------------
// Concept: a stone hall under a ribbed lavender dome with gold ribs, an open book
// over the entrance, a clock tower beside it (no religious symbols: gold balls on top),
// arched windows, steps, a bench, pots and stacks of books.
function church() {
  const y0 = 0.1, W = 0.95, D = 0.95, H = 0.72, front = D / 2, top = y0 + H;
  const parts = [
    part(box(W + 0.55, y0, D + 0.6, 0.04), { ramp: STONE_TRIM, at: [0.08, 0, 0.08] }),
    part(box(W, H, D, 0.06), { ramp: STONE, at: [0, y0, 0] }),
    part(box(W + 0.05, 0.12, D + 0.05, 0.03), { ramp: STONE_TRIM, at: [0, y0, 0] }),
    part(box(W + 0.08, 0.08, D + 0.08, 0.03), { ramp: STONE_TRIM, at: [0, top - 0.04, 0] }),
    ...[-1, 1].flatMap((sx) => quoins(sx * (W / 2 - 0.05), y0, H, front + 0.02, 0.13)),
    // drum and ribbed dome, a little lantern cupola and a gold ball
    part(drum(0.4, 0.42, 0.14, { seg: 24 }), { ramp: STONE_TRIM, at: [0, top + 0.02, -0.05] }),
    ...K.ribbedDome(0.4, { ribs: 8, squash: 0.92, at: [0, top + 0.16, -0.05] }),
    part(drum(0.07, 0.08, 0.1, { seg: 12 }), { color: PAL.glow, mat: "glow", at: [0, top + 0.53, -0.05] }),
    part(K.spire(0.09, 0.1, { seg: 12, flare: 0.2 }), { ramp: PAL.roof, at: [0, top + 0.64, -0.05] }),
    part(K.sphere(0.04, 10), { ramp: PAL.gold, at: [0, top + 0.76, -0.05] }),
    // entrance porch with a shingled gable and an open book over the door
    part(box(0.5, 0.62, 0.3, 0.05), { ramp: STONE, at: [-0.05, y0, front + 0.1] }),
    part(K.gableEnd(0.5, 0.36, 0.08), { ramp: STONE, at: [-0.05, y0 + 0.62, front + 0.22] }),
    part(K.gable(0.5, 0.4, 0.36, { overhang: 0.09, thick: 0.08, rows: 3 }), { ramp: PAL.roof, at: [-0.05, y0 + 0.63, front + 0.12] }),
    ...K.doorParts(0.27, 0.46, { at: [-0.05, y0, front + 0.26] }),
    ...steps(-0.05, front + 0.27, y0, 0.36, 2, 0.05, 0.12),
    ...[-1, 1].map((s) => part(box(0.13, 0.17, 0.02, 0.01), { ramp: PAL.cream, at: [-0.05 + s * 0.066, y0 + 0.66, front + 0.27], rot: [0, s * -0.42, s * 0.04] })),
    ...[-1, 1].map((s) => part(box(0.135, 0.012, 0.025, 0.004), { ramp: PAL.gold, at: [-0.05 + s * 0.066, y0 + 0.66, front + 0.28], rot: [0, s * -0.42, 0] })),
    // windows
    ...K.windowParts(0.18, 0.36, { at: [-0.36, y0 + 0.2, front + 0.02] }),
    ...[-0.22, 0.22].flatMap((z) => onSide(K.windowParts(0.17, 0.34, { at: [z, y0 + 0.2, W / 2 + 0.02] }), Math.PI / 2)),
    ...[-0.25, 0.25].flatMap((x) => onSide(K.windowParts(0.17, 0.34, { at: [x, y0 + 0.2, front + 0.02] }), Math.PI)),
    // the clock tower on the right
    part(box(0.3, 1.35, 0.3, 0.04), { ramp: STONE, at: [0.56, y0, -0.12] }),
    part(box(0.34, 0.07, 0.34, 0.02), { ramp: STONE_TRIM, at: [0.56, y0 + 0.75, -0.12] }),
    part(box(0.36, 0.08, 0.36, 0.02), { ramp: STONE_TRIM, at: [0.56, y0 + 1.32, -0.12] }),
    part(drum(0.085, 0.085, 0.03, { seg: 18 }), { ramp: PAL.cream, at: [0.56, y0 + 1.02, 0.04], rot: [Math.PI / 2, 0, 0] }),
    part(new THREE.TorusGeometry(0.09, 0.018, 6, 20), { ramp: PAL.gold, at: [0.56, y0 + 1.02, 0.045] }),
    part(box(0.012, 0.06, 0.01, 0.003), { color: PAL.ink, at: [0.56, y0 + 1.02, 0.05] }),
    part(box(0.045, 0.012, 0.01, 0.003), { color: PAL.ink, at: [0.58, y0 + 1.02, 0.05] }),
    ...[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((ry) => ({ ...part(K.arch(0.1, 0.17, 0.04), { color: PAL.ink, at: [0, y0 + 1.12, 0.15] }), })).map((p, i) => ({ ...p, geometry: p.geometry.clone().rotateY([0, Math.PI / 2, Math.PI, -Math.PI / 2][i]).translate(0.56, 0, -0.12) })),
    ...pyramidRoof(0.38, 0.42, ROOF_BLUE, y0 + 1.4, 0.56, -0.12),
    // a reading bench, books, pots, a lamp
    part(box(0.36, 0.035, 0.11, 0.015), { ramp: PAL.wood, at: [-0.48, y0 + 0.13, front + 0.3] }),
    ...[-1, 1].map((s) => part(box(0.035, 0.13, 0.09, 0.01), { ramp: PAL.woodDark, at: [-0.48 + s * 0.14, y0, front + 0.3] })),
    ...[0, 1, 2].map((i) => part(box(0.18 - i * 0.02, 0.045, 0.13, 0.012), { ramp: [["#8fd7ff", "#4a90c8"], RED, PAL.gold][i], at: [0.33, y0 + i * 0.045, front + 0.32], rot: [0, i * 0.3, 0] })),
    ...pot(0.2, front + 0.28, y0, 0.8, 41),
    ...pot(-0.3, front + 0.28, y0, 0.8, 42),
    ...lantern(-0.72, front + 0.1, y0, 0.55),
    ...bush(0.75, 0.3, 0.13, 43),
  ];
  return K.node("church", parts, { reach: 0.2 });
}

// ---- windmill: the lab (a workshop windmill) ----------------------------------------------
// Concept: a round stone mill under a lavender dome with a gold weather vane, four
// lattice sails (they turn), an arched door up two steps, a porch with a shed roof
// over a workbench, a chalkboard, crates and lanterns.
function windmill() {
  const y0 = 0.08, h = 1.0, r = 0.38;
  const hub = [0, y0 + h - 0.08, r + 0.1];
  const sails = [part(K.sphere(0.07, 12), { ramp: PAL.woodDark, at: hub })];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = [part(box(0.05, 0.66, 0.045, 0.012), { ramp: PAL.woodDark, at: [0, 0.04, 0] })];
    for (const x of [0.04, 0.26]) arm.push(part(box(0.025, 0.5, 0.03, 0.008), { ramp: PAL.wood, at: [x, 0.2, 0.02] }));
    for (let k = 0; k < 6; k++) arm.push(part(box(0.24, 0.02, 0.025, 0.006), { ramp: PAL.wood, at: [0.15, 0.2 + k * 0.1, 0.02] }));
    arm.push(part(box(0.012, 0.5, 0.02, 0.004), { ramp: PAL.wood, at: [0.15, 0.2, 0.025] }));
    sails.push(...arm.map((p) => ({ ...p, geometry: p.geometry.clone().rotateZ(a).translate(...hub) })));
  }
  const parts = [
    part(drum(0.52, 0.56, y0, { seg: 20 }), { ramp: STONE_TRIM }),
    part(drum(r * 0.82, r, h, { seg: 22 }), { ramp: STONE, at: [0, y0, 0] }),
    part(drum(r * 1.04, r * 1.06, 0.2, { seg: 22 }), { ramp: STONE_TRIM, at: [0, y0, 0] }),
    part(drum(r * 0.9, r * 0.84, 0.08, { seg: 22 }), { ramp: STONE_TRIM, at: [0, y0 + h - 0.02, 0] }),
    ...K.ribbedDome(r * 0.88, { ribs: 6, squash: 0.95, at: [0, y0 + h + 0.04, 0] }),
    // a wind pennant on a gold pole (no crossbar: from the front a vane reads as a cross)
    part(drum(0.014, 0.014, 0.36, { seg: 6 }), { ramp: PAL.gold, at: [0, y0 + h + 0.36, 0] }),
    ...flagParts([0.015, y0 + h + 0.7, 0], ["#5fe3ad", "#22a877"], 0.2, 0.11),
    part(K.sphere(0.035, 10), { ramp: PAL.gold, at: [0, y0 + h + 0.73, 0] }),
    part(drum(0.035, 0.035, 0.18, { seg: 8 }), { ramp: PAL.woodDark, at: [0, y0 + h - 0.08, r - 0.08], rot: [Math.PI / 2, 0, 0] }),
    // door, steps, windows
    ...K.doorParts(0.24, 0.4, { at: [0, y0, r * 0.98] }),
    ...steps(0, r * 1.04, y0, 0.32, 2, 0.04, 0.1),
    ...K.windowParts(0.13, 0.21, { at: [0, y0 + 0.55, r * 0.87] }),
    ...onSide(K.windowParts(0.13, 0.21, { at: [0, y0 + 0.5, r * 0.88] }), -Math.PI / 2),
    // the porch: two posts, a shed roof, a workbench with a vice and a flask
    ...[[0.45, 0.4], [0.75, 0.4], [0.75, -0.05]].map(([x, z]) => part(box(0.05, 0.6, 0.05, 0.015), { ramp: PAL.woodDark, at: [x, y0, z] })),
    part(box(0.48, 0.05, 0.6, 0.02), { ramp: PAL.roof, at: [0.58, y0 + 0.62, 0.18], rot: [0, 0, -0.18] }),
    part(box(0.36, 0.05, 0.22, 0.015), { ramp: PAL.wood, at: [0.6, y0 + 0.28, 0.15] }),
    ...[-1, 1].map((s) => part(box(0.04, 0.28, 0.04, 0.01), { ramp: PAL.woodDark, at: [0.6 + s * 0.15, y0, 0.15] })),
    part(K.sphere(0.04, 10), { ramp: ["#8fd7ff", "#4a90c8"], at: [0.54, y0 + 0.37, 0.15] }),
    part(box(0.07, 0.05, 0.06, 0.01), { ramp: PAL.metal, at: [0.68, y0 + 0.33, 0.12] }),
    // a chalkboard on legs, crates, a lantern
    part(box(0.34, 0.26, 0.03, 0.02), { ramp: PAL.wood, at: [-0.5, y0 + 0.22, 0.32], rot: [0, 0.5, 0] }),
    part(box(0.28, 0.2, 0.02, 0.01), { color: ["#3f4a63", "#2b3346"], at: [-0.497, y0 + 0.25, 0.335], rot: [0, 0.5, 0] }),
    ...[0, 1].map((k) => part(box(0.14 + k * 0.05, 0.012, 0.01, 0.004), { color: "#ffffff", at: [-0.49 - k * 0.01, y0 + 0.36 - k * 0.06, 0.35], rot: [0, 0.5, 0.2 - k * 0.3] })),
    ...[-1, 1].map((s) => part(K.beam([-0.5 + s * 0.12, y0, 0.32 - s * 0.06], [-0.5 + s * 0.11, y0 + 0.3, 0.3 - s * 0.05], 0.025), { ramp: PAL.woodDark })),
    ...crates(-0.5, -0.15, y0, 0.5),
    ...lantern(0.3, 0.58, y0, 0.45),
    ...pot(-0.25, 0.48, y0, 0.8, 51),
  ];
  return K.node("windmill", parts, { children: [{ name: "fan", pivot: hub, parts: sails }], reach: 0.2 });
}

// ---- archery: the quiz arena (a round training yard) -------------------------------------
// Concept: a sand ring inside a curved wooden fence on a stone curb, two straw
// targets with arrows, banners on poles, a covered stand with a shingled roof.
function archery() {
  const R = 0.78;
  const target = (x, z, ry) => {
    const face = [[0.26, PAL.cream], [0.2, RED], [0.13, PAL.cream], [0.06, PAL.gold]].map(([r, ramp], i) => part(drum(r, r, 0.05 + i * 0.012, { seg: 24 }), { ramp, rot: [Math.PI / 2, 0, 0], at: [0, 0.55, i * 0.006] }));
    const rim = part(new THREE.TorusGeometry(0.265, 0.03, 8, 24), { ramp: HAY, at: [0, 0.55, 0.03] });
    const legs = [-1, 1].map((s) => part(K.beam([s * 0.18, 0, -0.12], [s * 0.08, 0.6, 0.02], 0.035), { ramp: PAL.woodDark }));
    const back = part(K.beam([0, 0, -0.25], [0, 0.5, -0.02], 0.035), { ramp: PAL.woodDark });
    const arrows = [[0.05, 0.6], [-0.08, 0.5], [0.12, 0.47]].flatMap(([ax, ay]) => [
      part(K.beam([ax, ay, 0.02], [ax + 0.03, ay + 0.02, 0.24], 0.012), { ramp: PAL.wood }),
      part(box(0.05, 0.03, 0.05, 0.01), { ramp: PAL.roof, at: [ax + 0.03, ay + 0.005, 0.22] }),
    ]);
    return onSide([...face, rim, ...legs, back, ...arrows], ry).map((p) => ({ ...p, geometry: p.geometry.clone().translate(x, 0.05, z) }));
  };
  const fence = [];
  const gap = (a) => Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.42;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (gap(a)) continue;
    fence.push(part(box(0.06, 0.34, 0.06, 0.02), { ramp: PAL.woodDark, at: [Math.cos(a) * R, 0.06, Math.sin(a) * R] }));
  }
  for (const y of [0.16, 0.3]) {
    const rail = new THREE.TorusGeometry(R, 0.018, 6, 48, Math.PI * 2 - 0.84).rotateX(Math.PI / 2).rotateY(-Math.PI / 2 - 0.42);
    fence.push(part(rail, { ramp: PAL.wood, at: [0, y, 0] }));
  }
  const parts = [
    part(drum(R + 0.12, R + 0.14, 0.06, { seg: 36 }), { ramp: STONE_TRIM }),
    part(drum(R - 0.02, R - 0.02, 0.07, { seg: 36 }), { ramp: SAND, at: [0, 0.005, 0] }),
    ...fence,
    ...target(-0.28, -0.22, 0.25),
    ...target(0.24, -0.3, -0.2),
    // a covered stand at the back right: four posts, a shingled roof, a table
    ...[[0.32, -0.42], [0.66, -0.42], [0.32, -0.12], [0.66, -0.12]].map(([x, z]) => part(box(0.05, 0.58, 0.05, 0.015), { ramp: PAL.woodDark, at: [x, 0.06, z] })),
    part(K.gable(0.42, 0.42, 0.2, { overhang: 0.06, thick: 0.07, rows: 2 }), { ramp: PAL.roof, at: [0.49, 0.65, -0.27] }),
    part(box(0.28, 0.04, 0.16, 0.015), { ramp: PAL.wood, at: [0.49, 0.28, -0.3] }),
    ...crates(0.5, -0.27, 0.32, 0.2).map((p) => ({ ...p, geometry: p.geometry.clone().scale(0.5, 0.5, 0.5).translate(0.25, 0.16, -0.14) })),
    // banners on poles either side of the gate, a barrel and hay bales
    ...[[-0.45, 0.72], [0.45, 0.72]].flatMap(([x, z]) => [
      part(drum(0.02, 0.025, 1.15, { seg: 8 }), { ramp: PAL.woodDark, at: [x, 0.06, z] }),
      part(box(0.26, 0.02, 0.02, 0.006), { ramp: PAL.woodDark, at: [x, 1.12, z] }),
      part(box(0.22, 0.42, 0.02, 0.01), { ramp: PAL.roof, at: [x, 0.7, z + 0.02] }),
      part(box(0.08, 0.08, 0.01, 0.004), { ramp: PAL.gold, at: [x, 0.92, z + 0.035], rot: [0, 0, Math.PI / 4] }),
      part(K.sphere(0.03, 8), { ramp: PAL.gold, at: [x, 1.22, z] }),
    ]),
    ...barrel(-0.62, -0.35, 0.06, 0.8),
    ...[[-0.5, 0.25], [-0.35, 0.38]].map(([x, z], k) => part(box(0.24, 0.15, 0.16, 0.05), { ramp: HAY, at: [x, 0.06, z], rot: [0, k * 0.5, 0] })),
  ];
  return K.node("archery", parts, { reach: 0.2 });
}

// ---- small buildings ------------------------------------------------------------------------
function cottage(name, { W = 0.66, D = 0.6, H = 0.5, roof = PAL.roof, storeys = 1, seed = 1 } = {}) {
  const y0 = 0.06, front = D / 2, height = H * storeys, eave = y0 + height;
  const parts = [
    part(box(W + 0.2, y0, D + 0.24, 0.03), { ramp: STONE_TRIM, at: [0, 0, 0.04] }),
    part(box(W, height, D, 0.05), { ramp: storeys > 1 ? PAL.cream : STONE, at: [0, y0, 0] }),
    part(box(W + 0.04, 0.1, D + 0.04, 0.02), { ramp: STONE_TRIM, at: [0, y0, 0] }),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => part(box(0.07, height + 0.02, 0.07, 0.02), { ramp: PAL.woodDark, at: [sx * (W / 2), y0, sz * front] }))),
    ...(storeys > 1 ? [part(box(W + 0.04, 0.06, D + 0.04, 0.02), { ramp: PAL.woodDark, at: [0, y0 + H - 0.03, 0] })] : []),
    ...[-1, 1].map((sz) => part(K.gableEnd(W - 0.02, 0.42, 0.08), { ramp: storeys > 1 ? PAL.cream : STONE, at: [0, eave, sz * (front - 0.04)] })),
    part(K.gable(W, D, 0.42, { overhang: 0.1, thick: 0.09, rows: 3 }), { ramp: roof, at: [0, eave + 0.01, 0] }),
    part(box(0.14, 0.42, 0.14, 0.03), { ramp: STONE_TRIM, at: [W * 0.25, eave + 0.05, -0.08] }),
    part(box(0.2, 0.05, 0.2, 0.02), { ramp: STONE, at: [W * 0.25, eave + 0.47, -0.08] }),
    ...K.doorParts(0.2, 0.32, { at: [-W * 0.18, y0, front + 0.01] }),
    ...K.windowParts(0.14, 0.2, { at: [W * 0.22, y0 + 0.17, front + 0.01] }),
    ...(storeys > 1 ? [-0.18, 0.18].flatMap((x) => K.windowParts(0.13, 0.2, { at: [x * W * 1.3, y0 + H + 0.12, front + 0.01] })) : []),
    ...onSide(K.windowParts(0.13, 0.19, { at: [0, y0 + 0.17, W / 2 + 0.01] }), Math.PI / 2),
    ...flowerBox(W * 0.22, y0 + 0.06, front + 0.07, 0.24, seed),
    ...pot(-W * 0.45, front + 0.12, y0, 0.7, seed + 2),
    part(box(0.07, 0.11, 0.07, 0.015), { color: PAL.glow, mat: "glow", at: [-W * 0.18 + 0.17, y0 + 0.28, front + 0.05] }),
    ...bush(-W / 2 - 0.12, front, 0.12, seed + 4),
  ];
  return K.node(name, parts, { reach: 0.15 });
}

function well() {
  const parts = [
    part(K.lathe([[0, 0], [0.3, 0], [0.32, 0.04], [0.3, 0.3], [0.33, 0.32], [0.33, 0.36], [0.22, 0.36], [0.22, 0.1], [0, 0.1]], 12), { ramp: PAL.stone }),
    part(drum(0.22, 0.22, 0.02, { seg: 12 }), { ramp: PAL.water, at: [0, 0.24, 0] }),
    ...[-1, 1].map((s) => part(box(0.06, 0.6, 0.06, 0.02), { ramp: PAL.woodDark, at: [s * 0.27, 0.3, 0] })),
    part(K.gable(0.66, 0.5, 0.24, { overhang: 0.06, thick: 0.06 }), { ramp: ROOF_WARM, at: [0, 0.88, 0] }),
    part(drum(0.025, 0.025, 0.56, { seg: 6 }), { ramp: PAL.wood, at: [-0.28, 0.72, 0], rot: [0, 0, -Math.PI / 2] }),
    part(box(0.03, 0.12, 0.03, 0.01), { ramp: PAL.woodDark, at: [0.3, 0.66, 0.02] }),
    part(drum(0.006, 0.006, 0.26, { seg: 4 }), { color: PAL.cream, at: [0, 0.46, 0] }),
    part(K.lathe([[0, 0], [0.06, 0], [0.07, 0.1], [0, 0.1]], 8), { ramp: PAL.wood, at: [0, 0.38, 0] }),
    ...bush(0.3, 0.3, 0.1, 41),
  ];
  return K.node("well", parts, { reach: 0.15 });
}

function market() {
  const stripes = [];
  for (let i = 0; i < 6; i++) stripes.push(part(box(0.22, 0.03, 0.62, 0.01), { ramp: i % 2 ? PAL.cream : PAL.roof, at: [-0.6 + i * 0.24, 0.98, 0.02], rot: [0.35, 0, 0] }));
  const fruit = [];
  const rand = K.rng(5);
  for (let i = 0; i < 12; i++) fruit.push(part(K.sphere(0.04, 7), { ramp: [RED, PAL.gold, PAL.leaf][i % 3], at: [-0.55 + (i % 6) * 0.08 + Math.floor(i / 6) * 0.6, 0.62 + rand() * 0.02, 0.32 + (i % 2) * 0.05] }));
  const parts = [
    part(box(1.5, 0.05, 1.0, 0.02), { ramp: PAL.stone }),
    part(box(1.3, 0.5, 0.36, 0.04), { ramp: PAL.wood, at: [0, 0.05, 0.2] }),
    part(box(1.36, 0.05, 0.42, 0.02), { ramp: PAL.woodDark, at: [0, 0.55, 0.2] }),
    ...[[-0.66, 0.42], [0.66, 0.42], [-0.66, -0.3], [0.66, -0.3]].map(([x, z]) => part(box(0.06, 1.0, 0.06, 0.02), { ramp: PAL.woodDark, at: [x, 0.05, z] })),
    ...stripes,
    ...fruit,
    ...[-0.35, 0.35].map((x) => part(box(0.28, 0.08, 0.2, 0.02), { ramp: PAL.wood, at: [x, 0.6, 0.38] })),
    part(box(0.5, 0.14, 0.03, 0.02), { ramp: PAL.cream, at: [0, 1.1, 0.4] }),
    ...crates(0.55, -0.15, 0.05, 0.2),
    ...barrel(-0.55, -0.12, 0.05, 0.9),
  ];
  return K.node("market", parts, { reach: 0.15 });
}

function watermill() {
  const wheel = [];
  const c = [0.42, 0.38, 0];
  wheel.push(part(new THREE.TorusGeometry(0.34, 0.03, 6, 18).rotateY(Math.PI / 2), { ramp: PAL.woodDark, at: c }));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    wheel.push(part(box(0.14, 0.03, 0.1, 0.01), { ramp: PAL.wood, at: [c[0], c[1] + Math.sin(a) * 0.34, c[2] + Math.cos(a) * 0.34], rot: [-a, 0, 0] }));
  }
  wheel.push(part(drum(0.06, 0.06, 0.18, { seg: 8 }), { ramp: PAL.woodDark, at: [c[0] - 0.09, c[1], c[2]], rot: [0, 0, -Math.PI / 2] }));
  const base = cottage("tmp", { W: 0.62, D: 0.7, H: 0.55, roof: PAL.roof, seed: 11 }).parts;
  const parts = [
    ...base,
    ...wheel,
    part(box(0.22, 0.08, 0.95, 0.02), { ramp: PAL.water, mat: "glow", at: [0.45, 0.02, 0] }),
    ...[-1, 1].map((s) => part(box(0.04, 0.12, 0.95, 0.01), { ramp: PAL.wood, at: [0.45 + s * 0.12, 0.02, 0] })),
  ];
  return K.node("watermill", parts.map((p) => ({ ...p })), { reach: 0.15 });
}

// ---- nature --------------------------------------------------------------------------------
function trees() {
  const spots = [[0, 0, 1.15], [0.55, 0.35, 0.9], [-0.5, 0.3, 0.8], [0.25, -0.55, 0.95], [-0.45, -0.45, 0.75]];
  return K.node("trees", [
    ...spots.flatMap(([x, z, h], i) => at(K.pine(h, i + 2), [x, 0, z])),
    ...bush(0.65, -0.2, 0.14, 51),
    ...bush(-0.15, 0.6, 0.12, 52),
  ], { reach: 0.2 });
}

function treesB() {
  const spots = [[0.1, 0.05, 1.1], [-0.55, 0.35, 0.85], [0.55, -0.4, 0.9]];
  return K.node("treesB", [
    ...spots.flatMap(([x, z, h], i) => at(K.roundTree(h, i + 5), [x, 0, z])),
    ...bush(0.5, 0.5, 0.15, 61),
    ...bush(-0.5, -0.45, 0.13, 62),
    part(K.rock(0.12, 63), { ramp: PAL.stone, at: [0.2, 0, 0.7] }),
  ], { reach: 0.2 });
}

function hills() {
  const mound = K.lathe([[0, 0], [0.85, 0], [0.8, 0.12], [0.6, 0.38], [0.32, 0.56], [0, 0.6]], 9);
  return K.node("hills", [
    part(K.flat(mound), { ramp: PAL.grass }),
    part(K.rock(0.18, 71), { ramp: PAL.stone, at: [0.55, 0.05, 0.3] }),
    part(K.rock(0.12, 72), { ramp: PAL.stoneDark, at: [-0.6, 0.02, -0.1] }),
    ...at(K.pine(0.6, 73), [0.2, 0.5, -0.2]),
    ...at(K.pine(0.45, 74), [-0.3, 0.35, 0.25]),
    ...[0, 1, 2].map((i) => part(K.sphere(0.035, 6), { ramp: ["#ffc2e0", "#e86aa6"], at: [-0.1 + i * 0.25, 0.45 - i * 0.12, 0.45] })),
  ], { reach: 0.2 });
}

function mountain() {
  const peak = K.lathe([[0, 0], [0.9, 0], [0.75, 0.5], [0.45, 1.2], [0.2, 1.8], [0, 2.0]], 7);
  const snow = K.lathe([[0, 1.45], [0.36, 1.45], [0.32, 1.55], [0.18, 1.85], [0, 2.02]], 7);
  return K.node("mountain", [
    part(K.flat(peak), { ramp: PAL.stone }),
    part(K.flat(snow), { ramp: PAL.cloud }),
    part(K.flat(K.lathe([[0, 0], [0.98, 0], [0.92, 0.18], [0, 0.2]], 7)), { ramp: PAL.grass }),
    ...at(K.pine(0.55, 81), [0.75, 0.1, 0.35]),
    ...at(K.pine(0.45, 82), [-0.7, 0.1, 0.45]),
    part(K.rock(0.16, 83), { ramp: PAL.stoneDark, at: [0.2, 0.15, 0.85] }),
  ], { reach: 0.2 });
}


// The hall chest: planked body, dark iron bands on every edge, a big gold lock
// plate; the lid is a child node hinged at the back (the app opens it).
function chest() {
  const W = 1.3, D = 0.8, H = 0.6;
  const IRON = ["#7d7aa0", "#4a4769"];
  const pivot = [0, H, -D / 2];
  const lid = K.lathe([[0, -W / 2], [D / 2, -W / 2], [D / 2, W / 2], [0, W / 2]], 16);
  const half = lid.clone();
  half.rotateZ(Math.PI / 2);
  const pos = half.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, 0);
  half.computeVertexNormals();
  const lidParts = [
    part(half, { ramp: PAL.wood, at: [0, H, 0] }),
    ...[-W / 2 + 0.06, -0.3, 0.3, W / 2 - 0.06].map((x) => part(new THREE.TorusGeometry(D / 2 + 0.012, 0.035, 6, 20, Math.PI).rotateY(Math.PI / 2), { ramp: IRON, at: [x, H, 0] })),
    part(box(0.2, 0.2, 0.05, 0.03), { ramp: PAL.gold, at: [0, H - 0.08, D / 2 + 0.015] }),
  ];
  const parts = [
    part(box(W, H, D, 0.05), { ramp: PAL.wood }),
    // plank seams across the front and back
    ...[-1, 1].flatMap((sz) => [0.2, 0.4].map((y) => part(box(W - 0.06, 0.012, 0.01, 0.004), { ramp: PAL.woodDark, at: [0, y, sz * (D / 2 + 0.002)] }))),
    // iron: the bottom frame, four corner posts, two straps
    part(box(W + 0.04, 0.07, D + 0.04, 0.02), { ramp: IRON }),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => part(box(0.09, H + 0.02, 0.09, 0.02), { ramp: IRON, at: [sx * (W / 2 - 0.02), 0, sz * (D / 2 - 0.02)] }))),
    ...[-0.3, 0.3].map((x) => part(box(0.08, H, D + 0.03, 0.02), { ramp: IRON, at: [x, 0, 0] })),
    // rivets on the corner posts
    ...[-1, 1].flatMap((sx) => [0.15, 0.45].map((y) => part(K.sphere(0.018, 6), { ramp: PAL.metal, at: [sx * (W / 2 - 0.02), y, D / 2 + 0.03] }))),
    // the gold lock plate with a keyhole
    part(box(0.22, 0.24, 0.04, 0.03), { ramp: PAL.gold, at: [0, H - 0.3, D / 2 + 0.01] }),
    part(K.sphere(0.025, 8), { color: PAL.ink, at: [0, H - 0.15, D / 2 + 0.035] }),
    part(box(0.02, 0.05, 0.01, 0.004), { color: PAL.ink, at: [0, H - 0.22, D / 2 + 0.035] }),
    part(box(W * 0.9, 0.02, D * 0.85, 0.01), { color: PAL.gold, mat: "glow", at: [0, H - 0.04, 0] }),
  ];
  return K.node("chest", parts, { children: [{ name: "chest_lid", pivot, parts: lidParts }], reach: 0.15 });
}

const nodes = [
  K.node("hex", K.hexTile(1.1547, { depth: 1, seed: 2, seamless: true, tufts: 1 }), { reach: 0.05 }),
  castle(),
  towerA(),
  church(),
  windmill(),
  archery(),
  cottage("homeA", { seed: 3 }),
  cottage("homeB", { W: 0.6, D: 0.62, H: 0.48, storeys: 2, roof: PAL.roof, seed: 4 }),
  well(),
  market(),
  watermill(),
  trees(),
  treesB(),
  K.node("tree", K.pine(1.05, 9), { reach: 0.2 }),
  K.node("rock", [part(K.rock(0.17, 91), { ramp: PAL.stone })]),
  K.node("rockB", [part(K.rock(0.16, 92), { ramp: PAL.stone }), part(K.rock(0.1, 93), { ramp: PAL.stoneDark, at: [0.18, 0, 0.08] })]),
  hills(),
  mountain(),
  chest(),
];

const out = new URL("../../public/game/world.glb", import.meta.url).pathname;
console.table(await K.writeGLB(out, nodes));

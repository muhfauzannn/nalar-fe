// Builds public/game/world.glb: every model of the 3D world, made in code with
// the anatomy-game kit (game-kit.mjs): storybook buildings, nature, a hex tile
// and the hall chest, in Bernalar's lavender and mint, baked vertex colours,
// no textures. Node names are the ones app/features/lms/world3d asks for.
//
//   node scripts/world/build-world.mjs
//
// Sizes follow the old KayKit set (hex circumradius 1.155, buildings 1–4 tall)
// so the scene's scales still fit; doors face +z.
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

function flagParts(pivot, ramp = ["#5fe3ad", "#22a877"], w = 0.55, h = 0.3) {
  const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(w, -0.02 * w), new THREE.Vector2(w * 0.8, -h / 2), new THREE.Vector2(w, -h), new THREE.Vector2(0, -h)]);
  return [part(new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false }), { ramp, at: pivot, ao: false })];
}

function lantern(x, z, y0 = 0, h = 0.85) {
  return [
    part(drum(0.035, 0.045, h, { seg: 6 }), { ramp: PAL.woodDark, at: [x, y0, z] }),
    part(box(0.16, 0.2, 0.16, 0.04), { color: PAL.glow, mat: "glow", at: [x, y0 + h, z] }),
    part(drum(0.02, 0.13, 0.08, { seg: 4 }), { ramp: PAL.ink, at: [x, y0 + h + 0.2, z], rot: [0, Math.PI / 4, 0] }),
  ];
}

function barrel(x, z, y0 = 0, s = 1) {
  return [
    part(K.lathe([[0, 0], [0.16 * s, 0], [0.19 * s, 0.18 * s], [0.16 * s, 0.36 * s], [0, 0.36 * s]], 10), { ramp: PAL.wood, at: [x, y0, z] }),
    ...[0.06, 0.3].map((y) => part(new THREE.TorusGeometry(0.18 * s, 0.012, 5, 14).rotateX(Math.PI / 2), { color: PAL.ink, at: [x, y0 + y * s, z] })),
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

function bush(x, z, r = 0.26, seed = 1) {
  return [part(K.blob(r, seed, { detail: 1, squash: 0.8 }), { ramp: PAL.leaf, at: [x, r * 0.55, z] })];
}

// ---- castle: the assignment hall (Balai), the hero ---------------------------------------
// ground: stone plinth, three steps, path stones · body: plaster hall, timber posts and
// bands, quoins, stones, gable ends · roof: thick lavender gable, eave trim, chimney ·
// tower: tapered drum, belt, timber ring, spire, finial, pole, flag (moves) · openings:
// door, four windows, round gable window · life: lantern, book sign, flower boxes,
// barrel, crates, bushes, pine.
function castle() {
  const y0 = 0.22, W = 2.2, D = 1.5, H = 1.45, front = D / 2, eave = y0 + H;
  const tx = -1.2, tz = -0.25, tH = 2.55;
  const flagPivot = [tx, y0 + tH + 2.02, tz];
  const parts = [
    part(box(W + 0.5, y0, D + 0.6, 0.06), { ramp: PAL.stone, at: [0, 0, 0.1] }),
    part(drum(0.62, 0.66, y0, { seg: 10 }), { ramp: PAL.stone, at: [tx, 0, tz] }),
    ...[0, 1].map((i) => part(box(0.9 - i * 0.12, 0.1, 0.26, 0.04), { ramp: PAL.stone, at: [0, y0 - 0.1 * (i + 1), front + 0.42 + i * 0.2] })),
    ...[0, 1, 2].map((i) => part(drum(0.16, 0.18, 0.05, { seg: 7 }), { ramp: PAL.stone, at: [0.07 * (i % 2 ? 1 : -1), 0.005, front + 0.95 + i * 0.3] })),
    // body
    part(box(W, H, D, 0.08), { ramp: PAL.plaster, at: [0, y0, 0] }),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => part(box(0.16, H + 0.04, 0.16, 0.04), { ramp: PAL.woodDark, at: [sx * (W / 2 - 0.02), y0, sz * (front - 0.02)] }))),
    ...[-1, 1].flatMap((sz) => [y0 + 0.02, eave - 0.1].map((y) => part(box(W + 0.06, 0.12, 0.1, 0.03), { ramp: PAL.woodDark, at: [0, y, sz * (front + 0.01)] }))),
    ...[-1, 1].flatMap((sx) => [0, 1, 2, 3].map((i) => part(box(i % 2 ? 0.3 : 0.22, 0.2, 0.06, 0.05), { ramp: PAL.stone, at: [sx * (W / 2 - 0.2), y0 + 0.15 + i * 0.27, front + 0.04] }))),
    ...K.stoneCourses(W - 0.5, 0.5, { at: [0, y0 + 0.1, front + 0.02], seed: 9, density: 0.25, size: 0.2 }),
    ...[-1, 1].map((sz) => part(K.gableEnd(W - 0.04, 0.95, 0.14), { ramp: PAL.plaster, at: [0, eave, sz * (front - 0.07)] })),
    // roof
    part(K.gable(W, D, 0.95, { overhang: 0.26, thick: 0.17 }), { ramp: PAL.roof, at: [0, eave + 0.02, 0] }),
    ...[-1, 1].map((sx) => part(K.beam([sx * (W / 2 + 0.05), eave + 0.02, front + 0.12], [0, eave + 0.99, front + 0.12], 0.09), { ramp: PAL.woodDark })),
    part(box(0.34, 1.05, 0.34, 0.06), { ramp: PAL.stoneDark, at: [0.62, eave + 0.2, -0.3] }),
    part(box(0.46, 0.1, 0.46, 0.04), { ramp: PAL.stone, at: [0.62, eave + 1.25, -0.3] }),
    part(box(0.22, 0.06, 0.22, 0.02), { color: PAL.ink, at: [0.62, eave + 1.33, -0.3] }),
    // tower
    part(drum(0.42, 0.52, tH, { seg: 10 }), { ramp: PAL.stone, at: [tx, y0, tz] }),
    part(drum(0.5, 0.5, 0.12, { seg: 10 }), { ramp: PAL.stoneDark, at: [tx, y0 + tH * 0.55, tz] }),
    part(drum(0.5, 0.46, 0.14, { seg: 10 }), { ramp: PAL.woodDark, at: [tx, y0 + tH - 0.06, tz] }),
    part(K.spire(0.55, 1.35, { seg: 12, flare: 0.22 }), { ramp: PAL.roof, at: [tx, y0 + tH + 0.08, tz] }),
    part(K.sphere(0.09, 10), { ramp: PAL.gold, at: [tx, y0 + tH + 1.45, tz] }),
    part(drum(0.025, 0.025, 0.6, { seg: 6 }), { ramp: PAL.metal, at: [tx, y0 + tH + 1.5, tz] }),
    ...K.windowParts(0.26, 0.42, { at: [tx, y0 + tH * 0.66, tz + 0.43] }),
    ...K.windowParts(0.22, 0.36, { at: [tx, y0 + tH * 0.25, tz + 0.49] }),
    // openings
    ...K.doorParts(0.62, 0.95, { at: [0, y0, front + 0.02] }),
    ...[-0.68, 0.68].flatMap((x) => K.windowParts(0.36, 0.52, { at: [x, y0 + 0.5, front + 0.02] })),
    ...[-0.55, 0.55].flatMap((x) => onSide(K.windowParts(0.34, 0.48, { at: [x, y0 + 0.5, front + 0.02] }), Math.PI)),
    ...onSide(K.windowParts(0.3, 0.44, { at: [0.15, y0 + 0.5, W / 2 + 0.02] }), Math.PI / 2),
    part(drum(0.17, 0.17, 0.05, { seg: 14 }), { color: PAL.glow, mat: "glow", at: [0, eave + 0.38, front + 0.02], rot: [Math.PI / 2, 0, 0] }),
    part(new THREE.TorusGeometry(0.19, 0.05, 6, 16), { ramp: PAL.woodDark, at: [0, eave + 0.38, front + 0.06] }),
    // life
    ...lantern(0.62, front + 0.42, y0),
    part(box(0.7, 0.24, 0.06, 0.04), { ramp: PAL.wood, at: [0, y0 + 1.08, front + 0.06] }),
    ...[-1, 1].map((s) => part(box(0.14, 0.12, 0.03, 0.02), { ramp: PAL.gold, at: [s * 0.075, y0 + 1.14, front + 0.1], rot: [0, s * -0.35, 0] })),
    ...[-0.68, 0.68].flatMap((x, k) => flowerBox(x, y0 + 0.32, front + 0.1, 0.46, k + 1)),
    ...barrel(1.3, 0.55, y0),
    ...crates(1.32, -0.05, y0),
    ...bush(-1.0, 1.0, 0.24, 20),
    ...bush(1.15, 1.05, 0.22, 21),
  ];
  const s = 0.68;
  return K.node("castle", scaled(parts, s), { children: [{ name: "flag", pivot: flagPivot.map((v) => v * s), parts: scaled(flagParts(flagPivot), s) }], reach: 0.3 });
}

// ---- towerA: a hall not in focus (a small storybook tower) ---------------------------------
function towerA() {
  const r = 0.42, h = 1.45, y0 = 0.14;
  const pivot = [0, y0 + h + 1.25, 0];
  const parts = [
    part(drum(0.6, 0.64, y0, { seg: 8 }), { ramp: PAL.stone, flat: true }),
    part(drum(r * 0.9, r * 1.08, h, { seg: 10 }), { ramp: PAL.plaster, at: [0, y0, 0] }),
    ...[0.08, 0.5].map((k) => part(drum(r * 1.12 - k * 0.08, r * 1.14 - k * 0.08, 0.1, { seg: 10 }), { ramp: PAL.stoneDark, at: [0, y0 + h * k, 0] })),
    part(drum(r * 1.05, r, 0.12, { seg: 10 }), { ramp: PAL.woodDark, at: [0, y0 + h - 0.04, 0] }),
    part(K.spire(r * 1.05, 0.95, { seg: 12, flare: 0.25 }), { ramp: PAL.roof, at: [0, y0 + h + 0.08, 0] }),
    part(K.sphere(0.07, 10), { ramp: PAL.gold, at: [0, y0 + h + 1.05, 0] }),
    part(drum(0.02, 0.02, 0.35, { seg: 6 }), { ramp: PAL.metal, at: [0, y0 + h + 1.08, 0] }),
    ...K.doorParts(0.32, 0.55, { at: [0, y0, r * 1.02] }),
    ...K.windowParts(0.18, 0.3, { at: [0, y0 + h * 0.66, r * 0.95] }),
    ...onSide(K.windowParts(0.16, 0.26, { at: [0, y0 + h * 0.6, r * 0.95] }), Math.PI / 2),
    ...onSide(K.windowParts(0.16, 0.26, { at: [0, y0 + h * 0.6, r * 0.95] }), -Math.PI / 2),
    ...lantern(0.36, 0.42, y0, 0.6),
    ...barrel(-0.42, 0.32, y0, 0.8),
    ...bush(0.45, -0.3, 0.16, 31),
  ];
  return K.node("towerA", parts, { children: [{ name: "flag", pivot, parts: flagParts(pivot, PAL.roof, 0.4, 0.22) }], reach: 0.3 });
}

// ---- church: the library (a reading chapel) -----------------------------------------------
function church() {
  const y0 = 0.1, W = 0.86, D = 1.15, H = 0.7, front = D / 2, eave = y0 + H;
  const side = (z, y, w = 0.18, h = 0.42) => [
    ...onSide(K.windowParts(w, h, { at: [-z, y, W / 2 + 0.02] }), Math.PI / 2),
    ...onSide(K.windowParts(w, h, { at: [z, y, W / 2 + 0.02] }), -Math.PI / 2),
  ];
  const parts = [
    part(box(W + 0.36, y0, D + 0.4, 0.04), { ramp: PAL.stone, at: [0, 0, 0.05] }),
    part(box(W, H, D, 0.06), { ramp: PAL.plaster, at: [0, y0, 0] }),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => part(box(0.1, H + 0.03, 0.1, 0.03), { ramp: PAL.stoneDark, at: [sx * (W / 2), y0, sz * front] }))),
    ...[-1, 1].map((sz) => part(K.gableEnd(W - 0.02, 0.62, 0.1), { ramp: PAL.plaster, at: [0, eave, sz * (front - 0.05)] })),
    part(K.gable(W, D, 0.62, { overhang: 0.14, thick: 0.11 }), { ramp: PAL.roof, at: [0, eave + 0.01, 0] }),
    // a bell gable over the front with a little spire
    part(box(0.28, 0.32, 0.28, 0.04), { ramp: PAL.plaster, at: [0, eave + 0.45, front - 0.12] }),
    part(K.arch(0.12, 0.2, 0.3), { color: PAL.ink, at: [0, eave + 0.53, front - 0.12] }),
    part(K.sphere(0.045, 8), { ramp: PAL.gold, at: [0, eave + 0.66, front - 0.12] }),
    part(K.spire(0.2, 0.42, { seg: 8, flare: 0.2 }), { ramp: PAL.roof, at: [0, eave + 0.78, front - 0.12] }),
    part(K.sphere(0.05, 8), { ramp: PAL.gold, at: [0, eave + 1.22, front - 0.12] }),
    // openings: door, rose window, tall side windows
    ...K.doorParts(0.32, 0.5, { at: [0, y0, front + 0.02] }),
    part(drum(0.11, 0.11, 0.04, { seg: 12 }), { color: PAL.glow, mat: "glow", at: [0, eave + 0.22, front + 0.01], rot: [Math.PI / 2, 0, 0] }),
    part(new THREE.TorusGeometry(0.125, 0.03, 5, 14), { ramp: PAL.woodDark, at: [0, eave + 0.22, front + 0.04] }),
    ...side(-0.25, y0 + 0.17),
    ...side(0.25, y0 + 0.17),
    // a library: an open-book sign, books stacked by the door, a reading bench, a lamp
    part(box(0.42, 0.14, 0.04, 0.03), { ramp: PAL.wood, at: [0, y0 + 0.6, front + 0.05] }),
    ...[-1, 1].map((s) => part(box(0.09, 0.08, 0.02, 0.01), { ramp: PAL.gold, at: [s * 0.05, y0 + 0.63, front + 0.08], rot: [0, s * -0.35, 0] })),
    ...[0, 1, 2].map((i) => part(box(0.2 - i * 0.02, 0.05, 0.14, 0.015), { ramp: [["#8fd7ff", "#4a90c8"], RED, PAL.gold][i], at: [0.32, y0 + i * 0.05, front + 0.2], rot: [0, i * 0.3, 0] })),
    part(box(0.36, 0.04, 0.12, 0.02), { ramp: PAL.wood, at: [-0.3, y0 + 0.14, front + 0.22] }),
    ...[-1, 1].map((s) => part(box(0.04, 0.14, 0.1, 0.015), { ramp: PAL.woodDark, at: [-0.3 + s * 0.14, y0, front + 0.22] })),
    ...lantern(0.42, front + 0.42, y0, 0.55).map((p) => p),
    ...flowerBox(0, y0 + 0.02, -front - 0.1, 0.4, 7),
  ];
  return K.node("church", parts, { reach: 0.2 });
}

// ---- windmill: the lab (a workshop windmill) ------------------------------------------------
function windmill() {
  const y0 = 0.08, h = 0.95, r = 0.36;
  const hub = [0, y0 + h - 0.05, r + 0.08];
  const sails = [part(K.sphere(0.07, 10), { ramp: PAL.woodDark, at: hub })];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = [];
    arm.push(part(box(0.05, 0.62, 0.04, 0.015), { ramp: PAL.woodDark, at: [0, 0.04, 0] }));
    arm.push(part(box(0.2, 0.46, 0.02, 0.01), { ramp: PAL.cream, at: [0.12, 0.18, 0.01] }));
    for (let k = 0; k < 4; k++) arm.push(part(box(0.22, 0.02, 0.03, 0.008), { ramp: PAL.wood, at: [0.12, 0.2 + k * 0.11, 0.025] }));
    arm.push(part(box(0.02, 0.46, 0.03, 0.008), { ramp: PAL.wood, at: [0.22, 0.18, 0.025] }));
    sails.push(...arm.map((p) => ({ ...p, geometry: p.geometry.clone().rotateZ(a).translate(...hub) })));
  }
  const parts = [
    part(drum(0.48, 0.52, y0, { seg: 8 }), { ramp: PAL.stone, flat: true }),
    part(drum(r * 0.78, r, h, { seg: 10 }), { ramp: PAL.plaster, at: [0, y0, 0] }),
    part(drum(r * 1.02, r * 1.04, 0.22, { seg: 10 }), { ramp: PAL.stone, at: [0, y0, 0] }),
    part(drum(r * 0.86, r * 0.8, 0.08, { seg: 10 }), { ramp: PAL.woodDark, at: [0, y0 + h - 0.02, 0] }),
    part(K.dome(r * 0.88, { seg: 12, squash: 0.85 }), { ramp: PAL.roof, at: [0, y0 + h + 0.04, 0] }),
    // a weather vane: pole, arrow, gold ball
    part(drum(0.015, 0.015, 0.3, { seg: 5 }), { ramp: PAL.metal, at: [0, y0 + h + 0.32, 0] }),
    part(box(0.26, 0.03, 0.03, 0.01), { ramp: PAL.ink, at: [0, y0 + h + 0.56, 0], rot: [0, 0.6, 0] }),
    part(K.sphere(0.035, 8), { ramp: PAL.gold, at: [0, y0 + h + 0.62, 0] }),
    // the axle from the cap to the hub
    part(drum(0.035, 0.035, 0.16, { seg: 6 }), { ramp: PAL.woodDark, at: [0, y0 + h - 0.05, r - 0.06], rot: [Math.PI / 2, 0, 0] }),
    // door and windows
    ...K.doorParts(0.24, 0.38, { at: [0, y0, r * 0.98] }),
    ...K.windowParts(0.13, 0.2, { at: [0, y0 + 0.55, r * 0.86] }),
    ...onSide(K.windowParts(0.13, 0.2, { at: [0, y0 + 0.5, r * 0.88] }), Math.PI / 2),
    // the lab around it: a chalkboard on legs, crates of parts, a lamp
    part(box(0.36, 0.26, 0.03, 0.02), { ramp: PAL.wood, at: [0.5, y0 + 0.22, 0.3], rot: [0, -0.5, 0] }),
    part(box(0.3, 0.2, 0.02, 0.01), { color: ["#3f4a63", "#2b3346"], at: [0.505, y0 + 0.25, 0.31], rot: [0, -0.5, 0] }),
    ...[0, 1].map((k) => part(box(0.14 + k * 0.06, 0.012, 0.01, 0.004), { color: "#ffffff", at: [0.5 + k * 0.02, y0 + 0.36 - k * 0.06, 0.325], rot: [0, -0.5, 0.2 - k * 0.3] })),
    ...[-1, 1].map((s) => part(K.beam([0.5 + s * 0.13, y0, 0.32 + s * 0.08], [0.5 + s * 0.12, y0 + 0.3, 0.3 + s * 0.07], 0.025), { ramp: PAL.woodDark })),
    ...crates(-0.48, 0.25, y0, 0.5),
    part(K.sphere(0.04, 8), { ramp: ["#8fd7ff", "#4a90c8"], at: [-0.46, y0 + 0.52, 0.25] }),
    ...lantern(-0.3, 0.5, y0, 0.45),
  ];
  return K.node("windmill", parts, { children: [{ name: "fan", pivot: hub, parts: sails }], reach: 0.2 });
}

// ---- archery: the quiz arena (a training yard) ---------------------------------------------
function archery() {
  const target = (x, z, ry) => {
    const face = [
      [0.26, PAL.cream], [0.2, RED], [0.13, PAL.cream], [0.06, PAL.gold],
    ].map(([r, ramp], i) => part(drum(r, r, 0.05 + i * 0.012, { seg: 16 }), { ramp, rot: [Math.PI / 2, 0, 0], at: [0, 0.55, 0.0 + i * 0.006] }));
    const legs = [-1, 1].map((s) => part(K.beam([s * 0.18, 0, -0.12], [s * 0.08, 0.6, 0.02], 0.035), { ramp: PAL.woodDark }));
    const back = part(K.beam([0, 0, -0.25], [0, 0.5, -0.02], 0.035), { ramp: PAL.woodDark });
    const arrows = [[0.05, 0.6], [-0.08, 0.5], [0.12, 0.47]].flatMap(([ax, ay]) => [
      part(K.beam([ax, ay, 0.02], [ax + 0.03, ay + 0.02, 0.24], 0.012), { ramp: PAL.wood }),
      part(box(0.05, 0.03, 0.05, 0.01), { ramp: PAL.roof, at: [ax + 0.03, ay + 0.005, 0.22] }),
    ]);
    return onSide(at([...face, ...legs, back, ...arrows], [0, 0, 0]), ry).map((p) => ({ ...p, geometry: p.geometry.clone().translate(x, 0, z) }));
  };
  const fence = [];
  const posts = [[-0.8, -0.65], [-0.8, 0.1], [-0.8, 0.65], [0.8, -0.65], [0.8, 0.1], [0.8, 0.65], [-0.25, -0.65], [0.25, -0.65]];
  for (const [x, z] of posts) fence.push(part(box(0.07, 0.32, 0.07, 0.02), { ramp: PAL.woodDark, at: [x, 0.04, z] }));
  for (const sx of [-0.8, 0.8]) fence.push(part(box(0.04, 0.05, 1.32, 0.015), { ramp: PAL.wood, at: [sx, 0.26, 0] }));
  fence.push(part(box(1.6, 0.05, 0.04, 0.015), { ramp: PAL.wood, at: [0, 0.26, -0.65] }));
  const parts = [
    part(box(1.74, 0.06, 1.46, 0.03), { ramp: ["#e8d5ae", "#c7ab7a"], at: [0, 0, 0] }),
    ...fence,
    ...target(-0.38, -0.25, 0.2),
    ...target(0.32, -0.3, -0.15),
    // a covered stand at the back with a bench, and a scoreboard
    ...[[-0.55, -0.48], [-0.05, -0.48]].map(([x, z]) => part(box(0.06, 0.62, 0.06, 0.02), { ramp: PAL.woodDark, at: [x, 0.06, z] })),
    part(K.gable(0.6, 0.32, 0.22, { overhang: 0.06, thick: 0.06 }), { ramp: PAL.roof, at: [-0.3, 0.68, -0.5] }),
    part(box(0.5, 0.05, 0.14, 0.02), { ramp: PAL.wood, at: [-0.3, 0.22, -0.52] }),
    part(box(0.05, 0.9, 0.05, 0.015), { ramp: PAL.woodDark, at: [0.62, 0.06, 0.45] }),
    part(box(0.34, 0.24, 0.04, 0.02), { ramp: PAL.wood, at: [0.62, 0.7, 0.47] }),
    ...[-1, 0, 1].map((k) => part(K.sphere(0.035, 8), { ramp: PAL.gold, at: [0.62 + k * 0.09, 0.82, 0.5] })),
    part(box(0.26, 0.04, 0.02, 0.01), { color: PAL.ink, at: [0.62, 0.72, 0.5] }),
    // banners on poles, hay bales, a pencil rack
    ...[[-0.8, 0.65], [0.8, 0.65]].flatMap(([x, z], k) => [
      part(drum(0.02, 0.025, 1.1, { seg: 6 }), { ramp: PAL.metal, at: [x, 0.06, z] }),
      ...flagParts([x, 1.12, z], k ? PAL.roof : ["#5fe3ad", "#22a877"], 0.3, 0.22),
    ]),
    ...[[-0.5, 0.42], [-0.28, 0.48]].map(([x, z], k) => part(box(0.24, 0.16, 0.16, 0.05), { ramp: HAY, at: [x, 0.06 + k * 0.0, z], rot: [0, k * 0.5, 0] })),
    part(box(0.3, 0.04, 0.06, 0.015), { ramp: PAL.wood, at: [0.2, 0.32, 0.55] }),
    ...[0, 1, 2, 3].map((k) => part(drum(0.015, 0.015, 0.28, { seg: 6 }), { ramp: [PAL.gold, RED, PAL.roof, PAL.leaf][k], at: [0.1 + k * 0.065, 0.06, 0.55], rot: [0, 0, (k - 1.5) * 0.08] })),
  ];
  return K.node("archery", parts, { reach: 0.2 });
}

// ---- small buildings ------------------------------------------------------------------------
function cottage(name, { W = 0.66, D = 0.6, H = 0.5, roof = ROOF_WARM, storeys = 1, seed = 1 } = {}) {
  const y0 = 0.06, front = D / 2, height = H * storeys, eave = y0 + height;
  const parts = [
    part(box(W + 0.2, y0, D + 0.24, 0.03), { ramp: PAL.stone, at: [0, 0, 0.04] }),
    part(box(W, height, D, 0.05), { ramp: storeys > 1 ? PAL.cream : PAL.plaster, at: [0, y0, 0] }),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => part(box(0.08, height + 0.02, 0.08, 0.02), { ramp: PAL.woodDark, at: [sx * (W / 2), y0, sz * front] }))),
    ...(storeys > 1 ? [part(box(W + 0.04, 0.07, D + 0.04, 0.02), { ramp: PAL.woodDark, at: [0, y0 + H - 0.03, 0] })] : []),
    ...[-1, 1].map((sz) => part(K.gableEnd(W - 0.02, 0.42, 0.08), { ramp: PAL.plaster, at: [0, eave, sz * (front - 0.04)] })),
    part(K.gable(W, D, 0.42, { overhang: 0.1, thick: 0.08 }), { ramp: roof, at: [0, eave + 0.01, 0] }),
    part(box(0.14, 0.42, 0.14, 0.03), { ramp: PAL.stoneDark, at: [W * 0.25, eave + 0.05, -0.08] }),
    part(box(0.2, 0.05, 0.2, 0.02), { ramp: PAL.stone, at: [W * 0.25, eave + 0.47, -0.08] }),
    ...K.doorParts(0.2, 0.32, { at: [-W * 0.18, y0, front + 0.01] }),
    ...K.windowParts(0.14, 0.2, { at: [W * 0.22, y0 + 0.17, front + 0.01] }),
    ...(storeys > 1 ? [-0.18, 0.18].flatMap((x) => K.windowParts(0.13, 0.2, { at: [x * W * 1.3, y0 + H + 0.12, front + 0.01] })) : []),
    ...onSide(K.windowParts(0.13, 0.19, { at: [0, y0 + 0.17, W / 2 + 0.01] }), Math.PI / 2),
    ...flowerBox(W * 0.22, y0 + 0.06, front + 0.07, 0.24, seed),
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

function chest() {
  const W = 1.3, D = 0.8, H = 0.6;
  const pivot = [0, H, -D / 2];
  const lid = K.lathe([[0, -W / 2], [D / 2, -W / 2], [D / 2, W / 2], [0, W / 2]], 10);
  // a half-round lid along x: turn the lathe on its side and keep the top half
  const half = lid.clone();
  half.rotateZ(Math.PI / 2);
  const pos = half.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, 0);
  half.computeVertexNormals();
  const lidParts = [
    part(half, { ramp: PAL.wood, at: [0, H, 0] }),
    ...[-0.4, 0.4].map((x) => part(new THREE.TorusGeometry(D / 2 + 0.01, 0.03, 5, 16, Math.PI).rotateY(Math.PI / 2), { ramp: PAL.metal, at: [x, H, 0] })),
    part(box(0.16, 0.18, 0.05, 0.03), { ramp: PAL.gold, at: [0, H - 0.05, D / 2 + 0.01] }),
  ];
  const parts = [
    part(box(W, H, D, 0.06), { ramp: PAL.wood }),
    ...[-0.4, 0.4].map((x) => part(box(0.08, H + 0.02, D + 0.04, 0.02), { ramp: PAL.metal, at: [x, 0, 0] })),
    part(box(W + 0.04, 0.06, D + 0.04, 0.02), { ramp: PAL.woodDark, at: [0, 0, 0] }),
    part(box(0.12, 0.12, 0.04, 0.02), { ramp: PAL.gold, at: [0, H - 0.2, D / 2 + 0.01] }),
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
  K.node("cloud", K.cloud(2.1, 6), { ground: -20 }),
  K.node("cloudS", K.cloud(1.35, 7), { ground: -20 }),
  chest(),
];

const out = new URL("../../public/game/world.glb", import.meta.url).pathname;
console.table(await K.writeGLB(out, nodes));

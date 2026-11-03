// Builds public/game/tutor-spirit.glb: the AI tutor as a small magical spirit
// that floats in the classroom, made with the anatomy-game kit. A faceted
// crystal heart with a face, held by a brass crown and cup with hanging drops;
// two brass armillary rings carved with glowing runes orbit it, feather wings
// sit at its sides and sparkle motes drift around it. The app spins the rings,
// flaps the wings, blinks the eyes and swirls the motes by the tutor's state.
//
//   node scripts/world/build-tutor-spirit.mjs
//
// Units are metres, centred on the crystal; the face looks toward +z.
import * as THREE from "three";

import * as K from "./game-kit.mjs";

const { part, drum, PAL } = K;

const CRYSTAL = ["#effffb", "#9a8af7"];
const RUNE_LAV = ["#d7cffd", "#8b7cf6"];
const RUNE_MINT = ["#c8fff0", "#3fd6a4"];
const FEATHER = ["#ffffff", "#cfc6f6"];
const FEATHER_TIP = ["#efeaff", "#a594f5"];
const INK = PAL.ink;
const BLUSH = ["#ffb7c4", "#f08aa0"];

// the crystal: an icosahedron stretched a little, so it reads as a gem, not a ball
const R = 0.16;
const STRETCH = [1, 1.18, 0.92];
const TOP = R * STRETCH[1];
/** Half-width of the crystal at height y (front/back depth scaled by STRETCH[2]). */
const widthAt = (y) => R * Math.sqrt(Math.max(0, 1 - (y / TOP) ** 2));

const torus = (r, tube, seg = 40, arc = Math.PI * 2, sides = 5) => new THREE.TorusGeometry(r, tube, sides, seg, arc);
const ballOf = (r, seg = 10) => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)));

function starShape(outer, inner, points = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 ? inner : outer;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.016, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 }).translate(0, 0, -0.008);
}

// ---- the heart: crystal, crown and cup ------------------------------------------------------

function heart() {
  const parts = [part(new THREE.IcosahedronGeometry(R, 1), { ramp: CRYSTAL, mat: "glow", scale: STRETCH, flat: true })];

  // the face, on the front facets
  const front = (x, y, lift = 0) => R * STRETCH[2] * Math.sqrt(Math.max(0, 1 - (x / R) ** 2 - (y / TOP) ** 2)) + lift;
  for (const side of [-1, 1]) {
    parts.push(part(new THREE.CircleGeometry(0.022, 14), { ramp: BLUSH, at: [side * 0.088, -0.032, front(side * 0.088, -0.032, 0.006)], rot: [0, side * 0.55, 0] }));
  }
  parts.push(part(torus(0.024, 0.0055, 14, Math.PI), { ramp: INK, at: [0, -0.024, front(0, -0.03, 0.004)], rot: [0, 0, Math.PI] }));

  // crown: a brass cap and band, four prongs gripping the crystal, a star on a stem
  const capY = TOP - 0.03;
  parts.push(part(K.lathe([[0, 0], [0.074, 0], [0.084, 0.018], [0.064, 0.044], [0.024, 0.062], [0, 0.066]], 18), { ramp: PAL.gold, at: [0, capY, 0] }));
  parts.push(part(torus(0.078, 0.011, 24).rotateX(Math.PI / 2), { ramp: ["#fff1b8", "#c98a1c"], at: [0, capY + 0.004, 0] }));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const tipY = TOP * 0.6;
    const w = widthAt(tipY) + 0.006;
    const from = [Math.cos(a) * 0.074, capY + 0.004, Math.sin(a) * 0.074 * STRETCH[2]];
    const to = [Math.cos(a) * w, tipY, Math.sin(a) * w * STRETCH[2]];
    parts.push(part(K.beam(from, to, 0.016), { ramp: PAL.gold }));
    parts.push(part(ballOf(0.015, 8), { ramp: PAL.gold, at: to }));
  }
  parts.push(part(drum(0.011, 0.014, 0.07, { seg: 10 }), { ramp: PAL.gold, at: [0, capY + 0.058, 0] }));
  parts.push(part(ballOf(0.016, 8), { ramp: PAL.gold, at: [0, capY + 0.13, 0] }));
  parts.push(part(starShape(0.05, 0.022), { ramp: PAL.glow, mat: "glow", at: [0, capY + 0.17, 0] }));

  // cup: a brass cup holds the crystal's foot, with three crystal drops on chains
  const cupTop = -TOP * 0.74;
  parts.push(part(K.lathe([[0.004, -0.1], [0.028, -0.1], [0.042, -0.086], [0.078, -0.052], [0.104, -0.012], [0.112, 0], [0.1, 0.006]], 20), { ramp: PAL.gold, at: [0, cupTop, 0] }));
  parts.push(part(torus(0.104, 0.009, 28).rotateX(Math.PI / 2), { ramp: RUNE_LAV, at: [0, cupTop + 0.002, 0] }));
  parts.push(part(ballOf(0.02, 8), { ramp: PAL.gold, at: [0, cupTop - 0.104, 0] }));
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + Math.PI / 6;
    const x = Math.cos(a) * 0.052, z = Math.sin(a) * 0.052;
    const len = 0.05 + i * 0.012;
    parts.push(part(drum(0.004, 0.004, len, { seg: 5, bevel: 0 }), { ramp: PAL.gold, at: [x, cupTop - 0.07 - len, z] }));
    parts.push(part(new THREE.OctahedronGeometry(0.02, 0), { ramp: RUNE_MINT, mat: "glow", scale: [1, 1.6, 1], at: [x, cupTop - 0.09 - len, z] }));
  }
  return parts;
}

/** The eyes, a node of their own so the app can blink them. */
function eyes() {
  const front = (x, y, lift) => R * STRETCH[2] * Math.sqrt(Math.max(0, 1 - (x / R) ** 2 - (y / TOP) ** 2)) + lift;
  return [-1, 1].flatMap((side) => [
    part(ballOf(0.026, 12), { ramp: INK, scale: [1, 1.38, 0.5], at: [side * 0.056, 0.018, front(side * 0.056, 0.018, 0.002)] }),
    part(ballOf(0.009, 8), { color: "#ffffff", mat: "glow", at: [side * 0.049, 0.034, front(side * 0.049, 0.034, 0.012)] }),
  ]);
}

// ---- the orbiting rings ----------------------------------------------------------------------

/** A brass ring in the x–z plane with runes on its outer face. */
function ring(radius, tube, runes, ramp) {
  const parts = [part(torus(radius, tube).rotateX(Math.PI / 2), { ramp: PAL.gold })];
  // an inner lip so the ring reads as a band, not a wire
  parts.push(part(torus(radius - tube * 1.3, tube * 0.45, 32, Math.PI * 2, 3).rotateX(Math.PI / 2), { ramp: ["#ffe9a6", "#b9801c"] }));
  for (let i = 0; i < runes; i++) {
    const a = (i * Math.PI * 2) / runes;
    const r = radius + tube * 0.7;
    const shape = i % 3 === 0 ? new THREE.OctahedronGeometry(0.014, 0) : new THREE.BoxGeometry(0.026, 0.012, 0.012);
    parts.push(part(shape, { ramp, mat: "glow", at: [Math.cos(a) * r, 0, Math.sin(a) * r], rot: [0, -a, 0] }));
  }
  return parts;
}

// ---- wings ---------------------------------------------------------------------------------------

const SHOULDER = [0.135, 0.05, -0.03];

/** Three feather lobes fanning up and out from the shoulder, plus a brass cuff. */
function wing(side) {
  const [sx, sy, sz] = SHOULDER;
  const parts = [part(ballOf(0.022, 10), { ramp: PAL.gold, at: [side * sx, sy, sz] })];
  const lobes = [
    { len: 0.22, up: 0.6, w: 0.062 },
    { len: 0.18, up: 0.25, w: 0.052 },
    { len: 0.13, up: -0.1, w: 0.042 },
  ];
  lobes.forEach(({ len, up, w }, i) => {
    const g = ballOf(1, 10).scale(len / 2, w, 0.012).translate(len / 2, 0, 0).rotateZ(up);
    if (side < 0) g.scale(-1, 1, 1);
    parts.push(part(g, { ramp: i === 0 ? FEATHER : FEATHER_TIP, at: [side * (sx + 0.006), sy + 0.004 - i * 0.008, sz - i * 0.006] }));
  });
  return parts;
}

// ---- sparkle motes -----------------------------------------------------------------------------

function motes() {
  const random = K.rng(11);
  return Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + random() * 0.4;
    const r = 0.34 + random() * 0.08;
    const y = (random() - 0.5) * 0.36;
    const size = 0.012 + random() * 0.01;
    return part(new THREE.OctahedronGeometry(size, 0), { ramp: i % 2 ? PAL.glow : RUNE_MINT, mat: "glow", at: [Math.cos(a) * r, y, Math.sin(a) * r], scale: [1, 1.5, 1] });
  });
}

// ---- write -------------------------------------------------------------------------------------

// It floats: bake its shade as if the ground were far below, so it has no contact shadow.
const floating = { ground: -10, reach: 0.05 };
const spirit = K.node("tutorSpirit", heart(), {
  ...floating,
  children: [
    { name: "spiritEyes", pivot: [0, 0.018, 0.13], parts: eyes() },
    { name: "spiritRingA", pivot: [0, 0, 0], parts: ring(0.27, 0.014, 12, RUNE_LAV) },
    { name: "spiritRingB", pivot: [0, 0, 0], parts: ring(0.235, 0.011, 9, RUNE_MINT).map((p) => ({ ...p, geometry: p.geometry.rotateX(Math.PI / 2) })) },
    { name: "spiritWingL", pivot: [-SHOULDER[0], SHOULDER[1], SHOULDER[2]], parts: wing(-1) },
    { name: "spiritWingR", pivot: [SHOULDER[0], SHOULDER[1], SHOULDER[2]], parts: wing(1) },
    { name: "spiritMotes", pivot: [0, 0, 0], parts: motes() },
  ],
});

const out = new URL("../../public/game/tutor-spirit.glb", import.meta.url).pathname;
console.table(await K.writeGLB(out, [spirit]));

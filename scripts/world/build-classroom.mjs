// Builds public/game/classroom.glb: the course classroom the student walks into
// from an island (docs/world-concept/classroom-*.png), made in code with the
// anatomy-game kit. One room, four stations: the blackboard at the front (the
// lesson PDF is laid on it by the app), the lab bench on the left, the desk of
// assignment books on the right and the quiz target by the window. Also writes
// app/features/lms/world3d/classroom-layout.json, where the app reads where the
// board, the stations and the camera are, so model and app never drift apart.
//
//   node scripts/world/build-classroom.mjs
//
// Units are metres: the room is 12 wide (x), 10 deep (z, back wall at -5) and
// 5.4 high; the student looks in from +z.
import { writeFileSync } from "node:fs";
import * as THREE from "three";

import * as K from "./game-kit.mjs";

const { part, box, drum, PAL } = K;

const W = 12, D = 8.6, H = 5.2;
const BACK = -D / 2;
const STONE = ["#f6f1fb", "#d9d0ea"];
const STONE_TRIM = ["#ddd5ee", "#ada4cb"];
const LAV = ["#a594f5", "#5e4ac4"];
const BOARD = ["#2f6b55", "#214d3d"];
const PAPER = ["#fffaf0", "#eadfca"];
const RED = ["#ff7b6e", "#d2443c"];

const slab = (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
const at = (parts, v) => K.move(parts.flat(), v);

// ---- the room -------------------------------------------------------------------------------

function floor() {
  const parts = [];
  const rows = 20;
  for (let i = 0; i < rows; i++) {
    const z = BACK + (i + 0.5) * (D / rows);
    parts.push(part(slab(W, 0.06, D / rows - 0.02), { ramp: i % 2 ? ["#b98458", "#94653f"] : ["#ad7a50", "#8a5c38"], at: [0, 0, z], ao: false }));
  }
  // a round lavender rug with a gold ring in front of the teacher's desk
  parts.push(part(drum(2.1, 2.1, 0.03, { seg: 40, bevel: 0.01 }), { ramp: LAV, at: [0, 0.06, -0.9] }));
  parts.push(part(new THREE.TorusGeometry(1.75, 0.035, 4, 48).rotateX(Math.PI / 2), { color: PAL.gold, at: [0, 0.1, -0.9] }));
  return parts;
}

function walls() {
  const parts = [];
  const wall = (w, at, rot = [0, 0, 0]) => {
    parts.push(part(slab(w, H, 0.3), { ramp: STONE, at, rot }));
    // wood wainscot and a lavender rail along the foot of each wall
    parts.push(part(slab(w, 1.1, 0.08), { ramp: PAL.wood, at: [at[0], 0, at[2]], rot }));
    parts.push(part(slab(w, 0.08, 0.14), { ramp: LAV, at: [at[0], 1.1, at[2]], rot }));
    parts.push(part(slab(w, 0.16, 0.16), { ramp: STONE_TRIM, at: [at[0], H - 0.16, at[2]], rot }));
  };
  wall(W, [0, 0, BACK + 0.12]);
  wall(D, [-W / 2 + 0.12, 0, 0], [0, Math.PI / 2, 0]);
  wall(D, [W / 2 - 0.12, 0, 0], [0, -Math.PI / 2, 0]);
  // the ceiling: lavender boards above the beams
  parts.push(part(slab(W, 0.1, D), { ramp: ["#8f7fe0", "#6a58c8"], at: [0, H - 0.02, 0], ao: false }));
  // lavender ceiling beams across the room and two along the walls
  for (let i = 0; i < 5; i++) {
    const z = BACK + 0.8 + i * 2.1;
    parts.push(part(slab(W - 0.4, 0.28, 0.32), { ramp: LAV, at: [0, H - 0.28, z] }));
  }
  for (const x of [-W / 2 + 0.4, W / 2 - 0.4]) parts.push(part(slab(0.32, 0.3, D), { ramp: LAV, at: [x, H - 0.6, 0] }));
  return parts;
}

// ---- the blackboard (front) -----------------------------------------------------------------

export const BOARD_SIZE = { width: 4.4, height: 2.6 };
const BOARD_CENTER = [0, 2.75, BACK + 0.36];

function blackboard() {
  const { width: bw, height: bh } = BOARD_SIZE;
  const [cx, cy, cz] = BOARD_CENTER;
  const f = 0.16;
  return [
    part(slab(bw, bh, 0.06), { color: BOARD[0], at: [cx, cy - bh / 2, cz - 0.05], ao: false }),
    // the wooden frame: four rails with gold corner studs
    part(box(bw + f * 2, f, 0.16, 0.03), { ramp: PAL.wood, at: [cx, cy + bh / 2, cz - 0.04] }),
    part(box(bw + f * 2, f, 0.16, 0.03), { ramp: PAL.wood, at: [cx, cy - bh / 2 - f, cz - 0.04] }),
    part(box(f, bh, 0.16, 0.03), { ramp: PAL.wood, at: [cx - bw / 2 - f / 2, cy - bh / 2, cz - 0.04] }),
    part(box(f, bh, 0.16, 0.03), { ramp: PAL.wood, at: [cx + bw / 2 + f / 2, cy - bh / 2, cz - 0.04] }),
    ...[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => part(K.sphere(0.06, 8), { ramp: PAL.gold, at: [cx + sx * (bw / 2 + f / 2), cy + sy * (bh / 2 + f / 2) - 0.06, cz + 0.06] })),
    // chalk tray with two sticks
    part(box(bw * 0.9, 0.06, 0.22, 0.02), { ramp: PAL.woodDark, at: [cx, cy - bh / 2 - f - 0.05, cz + 0.06] }),
    part(drum(0.02, 0.02, 0.16, { seg: 6 }), { color: "#ffffff", at: [cx - 1.2, cy - bh / 2 - f + 0.03, cz + 0.08], rot: [0, 0, Math.PI / 2] }),
    part(drum(0.02, 0.02, 0.12, { seg: 6 }), { color: "#ffd9e8", at: [cx - 0.9, cy - bh / 2 - f + 0.03, cz + 0.1], rot: [0, 0, Math.PI / 2] }),
    // a gold crest above, a pediment of wood behind it
    // a half-round wooden crest with a gold medallion
    part(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 24, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), { ramp: PAL.wood, at: [cx, cy + bh / 2 + f, cz - 0.04] }),
    part(drum(0.2, 0.2, 0.05, { seg: 20 }), { ramp: PAL.gold, at: [cx, cy + bh / 2 + f + 0.28, cz + 0.04], rot: [Math.PI / 2, 0, 0] }),
    // banners and wall lamps either side
    ...[-1, 1].flatMap((s) => [
      part(drum(0.025, 0.025, 1.0, { seg: 6 }), { ramp: PAL.gold, at: [cx + s * 3.15, cy + 1.25, cz], rot: [0, 0, Math.PI / 2] }),
      part(slab(0.8, 1.7, 0.03), { ramp: LAV, at: [cx + s * 3.15, cy - 0.45, cz] }),
      part(new THREE.ConeGeometry(0.4, 0.3, 3).rotateZ(Math.PI).rotateY(Math.PI / 6), { ramp: LAV, at: [cx + s * 3.15, cy - 0.3, cz], scale: [1, 1, 0.08] }),
      part(drum(0.05, 0.05, 0.5, { seg: 6 }), { ramp: PAL.gold, at: [cx + s * 2.6, cy + 0.15, cz + 0.12], rot: [Math.PI / 2, 0, 0] }),
      part(box(0.22, 0.3, 0.22, 0.05), { color: PAL.glow, mat: "glow", at: [cx + s * 2.6, cy - 0.05, cz + 0.36] }),
      part(drum(0.02, 0.16, 0.12, { seg: 4 }), { ramp: PAL.ink, at: [cx + s * 2.6, cy + 0.25, cz + 0.36], rot: [0, Math.PI / 4, 0] }),
    ]),
  ];
}

// ---- the teacher's desk and the chandelier --------------------------------------------------

function teacherDesk() {
  const x = 0, z = -2.9;
  return [
    part(box(2.6, 0.12, 1.1, 0.04), { ramp: PAL.wood, at: [x, 0.86, z] }),
    part(box(2.4, 0.86, 0.9, 0.06), { ramp: PAL.woodDark, at: [x, 0, z] }),
    part(slab(0.5, 0.7, 0.02), { ramp: LAV, at: [x, 0.16, z + 0.46] }),
    part(K.sphere(0.06, 8), { ramp: PAL.gold, at: [x, 0.48, z + 0.48] }),
    // lamp, books and a quill
    part(drum(0.12, 0.14, 0.04, { seg: 12 }), { ramp: PAL.gold, at: [x + 0.85, 0.98, z - 0.15] }),
    part(drum(0.02, 0.02, 0.36, { seg: 6 }), { ramp: PAL.gold, at: [x + 0.85, 1.0, z - 0.15] }),
    part(K.lathe([[0.06, 0], [0.2, 0], [0.12, 0.2], [0.05, 0.22]], 14), { color: PAL.glow, mat: "glow", at: [x + 0.85, 1.32, z - 0.15] }),
    ...[0, 1, 2].map((i) => part(box(0.5 - i * 0.05, 0.09, 0.36, 0.02), { ramp: [LAV, RED, ["#7fd6b0", "#2f9b72"]][i], at: [x - 0.75, 0.98 + i * 0.09, z - 0.1], rot: [0, i * 0.2, 0] })),
    part(new THREE.ConeGeometry(0.03, 0.42, 6).rotateZ(-0.5), { color: "#ffffff", at: [x - 0.25, 1.15, z + 0.05] }),
    part(drum(0.07, 0.06, 0.1, { seg: 10 }), { ramp: PAL.ink, at: [x - 0.32, 0.98, z + 0.05] }),
  ];
}

function chandelier() {
  const y = H - 1.4;
  return [
    part(drum(0.02, 0.02, 1.1, { seg: 6 }), { ramp: PAL.gold, at: [0, y + 0.3, -0.9] }),
    part(K.lathe([[0.05, 0], [0.55, 0.05], [0.6, 0.12], [0.5, 0.2], [0.2, 0.32], [0.05, 0.36]], 18), { ramp: PAL.gold, at: [0, y, -0.9] }),
    part(K.lathe([[0.1, 0], [0.42, 0.02], [0.34, 0.14], [0.1, 0.16]], 16), { color: PAL.glow, mat: "glow", at: [0, y - 0.12, -0.9] }),
  ];
}

// ---- the lab bench (left) -------------------------------------------------------------------

const LAB = { x: -4.55, z: -1.0 };

function labBench() {
  const { x, z } = LAB;
  const L = 3.4, Dp = 1.2, Ht = 0.95;
  const parts = [
    part(box(Dp, 0.1, L, 0.03), { ramp: PAL.wood, at: [x, Ht - 0.1, z] }),
    part(box(Dp - 0.1, Ht - 0.1, L - 0.1, 0.05), { ramp: PAL.woodDark, at: [x, 0, z] }),
    ...[-1, 0, 1].map((i) => part(box(0.04, 0.24, 0.9, 0.01), { ramp: PAL.wood, at: [x + Dp / 2 - 0.03, 0.45, z + i * 1.05] })),
    ...[-1, 0, 1].map((i) => part(K.sphere(0.035, 6), { ramp: PAL.gold, at: [x + Dp / 2, 0.57, z + i * 1.05] })),
  ];
  // the inclined plane: a ramp on a post with a gear, and a block on it
  const ramp = new THREE.Group();
  const base = [x + 0.05, Ht, z + 0.2];
  parts.push(part(box(0.5, 0.08, 1.6, 0.02), { ramp: PAL.metal, at: base }));
  parts.push(part(box(0.1, 0.6, 0.1, 0.02), { ramp: PAL.metal, at: [base[0], Ht, base[2] - 0.55] }));
  parts.push(part(box(0.34, 0.06, 1.7, 0.02), { ramp: ["#f1d9a4", "#cfa86a"], at: [base[0], Ht + 0.32, base[2]], rot: [0.36, 0, 0] }));
  parts.push(part(box(0.24, 0.2, 0.24, 0.03), { ramp: ["#7fe6be", "#2f9b72"], at: [base[0], Ht + 0.55, base[2] - 0.35], rot: [0.36, 0, 0] }));
  parts.push(part(drum(0.2, 0.2, 0.06, { seg: 16 }), { ramp: PAL.gold, at: [base[0] + 0.2, Ht + 0.45, base[2] - 0.55], rot: [0, 0, Math.PI / 2] }));
  parts.push(part(new THREE.TorusGeometry(0.2, 0.025, 4, 12).rotateY(Math.PI / 2), { color: PAL.woodDark, at: [base[0] + 0.24, Ht + 0.45, base[2] - 0.55] }));
  void ramp;
  // a small chalkboard on an easel, flasks and a stool
  parts.push(part(box(0.06, 0.62, 0.8, 0.02), { ramp: PAL.wood, at: [x - 0.15, Ht, z - 1.15], rot: [0, 0, -0.08] }));
  parts.push(part(box(0.04, 0.5, 0.68, 0.01), { ramp: BOARD, at: [x - 0.1, Ht + 0.06, z - 1.15], rot: [0, 0, -0.08] }));
  for (const [dz, h, c] of [[1.25, 0.32, PAL.crystal], [1.45, 0.24, ["#ffd1e6", "#e86aa6"]]]) {
    parts.push(part(K.lathe([[0, 0], [0.09, 0], [0.1, 0.05], [0.04, h * 0.6], [0.035, h], [0, h]], 12), { color: c, mat: "glow", at: [x - 0.1, Ht, z + dz] }));
  }
  parts.push(part(drum(0.26, 0.24, 0.1, { seg: 16 }), { ramp: LAV, at: [x + 1.15, 0.62, z - 0.2] }));
  parts.push(part(drum(0.2, 0.22, 0.62, { seg: 12 }), { ramp: PAL.woodDark, at: [x + 1.15, 0, z - 0.2] }));
  // a shelf on the left wall with jars and a mint crystal
  const sx = -W / 2 + 0.45;
  parts.push(part(box(0.5, 0.08, 2.4, 0.02), { ramp: PAL.wood, at: [sx, 2.35, z - 0.2] }));
  for (let i = 0; i < 5; i++) parts.push(part(K.lathe([[0, 0], [0.08, 0], [0.09, 0.18], [0.05, 0.22], [0, 0.22]], 10), { color: i % 2 ? PAL.glow : PAL.crystal, mat: i === 2 ? "glow" : "base", at: [sx, 2.43, z - 1.1 + i * 0.45] }));
  parts.push(part(new THREE.OctahedronGeometry(0.2, 0), { ramp: PAL.crystal, mat: "glow", at: [sx, 2.6, z + 1.2], scale: [1, 1.5, 1] }));
  return parts;
}

// ---- the book desk (right) and the window, target and shelf ---------------------------------

const BOOKS = { x: 4.0, z: 0.9, top: 0.92 };

function bookDesk() {
  const { x, z, top } = BOOKS;
  return [
    part(box(2.4, 0.1, 1.3, 0.03), { ramp: PAL.wood, at: [x, top - 0.1, z] }),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => part(box(0.12, top - 0.1, 0.12, 0.02), { ramp: PAL.woodDark, at: [x + sx * 1.05, 0, z + sz * 0.5] })),
    part(box(0.6, 0.02, 0.5, 0.01), { ramp: PAPER, at: [x - 0.75, top, z + 0.15], rot: [0, 0.3, 0] }),
    part(drum(0.08, 0.07, 0.16, { seg: 10 }), { ramp: PAL.ink, at: [x + 0.95, top, z - 0.4] }),
    ...[0, 1, 2].map((i) => part(drum(0.012, 0.012, 0.3, { seg: 5 }), { color: [PAL.gold, LAV, RED][i], at: [x + 0.95 + (i - 1) * 0.03, top + 0.1, z - 0.4], rot: [0, 0, (i - 1) * 0.15] })),
    // a chair pulled up to it: legs, a lavender cushion, a back with slats
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => part(box(0.07, 0.5, 0.07, 0.01), { ramp: PAL.woodDark, at: [x + sx * 0.28, 0, z + 1.05 + sz * 0.26] })),
    part(box(0.66, 0.08, 0.62, 0.03), { ramp: PAL.wood, at: [x, 0.5, z + 1.05] }),
    part(box(0.6, 0.06, 0.56, 0.03), { ramp: LAV, at: [x, 0.58, z + 1.05] }),
    ...[-1, 1].map((sx) => part(box(0.07, 0.75, 0.07, 0.01), { ramp: PAL.woodDark, at: [x + sx * 0.28, 0.55, z + 1.33] })),
    ...[0, 1, 2].map((i) => part(box(0.05, 0.5, 0.04, 0.01), { ramp: PAL.wood, at: [x + (i - 1) * 0.16, 0.62, z + 1.33] })),
    part(box(0.66, 0.1, 0.08, 0.02), { ramp: PAL.wood, at: [x, 1.24, z + 1.33] }),
  ];
}

const WINDOW = { z: -1.4, y: 1.5, w: 1.8, h: 2.5 };

function window_() {
  const { z, y, w, h } = WINDOW;
  const x = W / 2 - 0.3;
  return K.turn([
    part(K.archFrame(w + 0.3, h + 0.3, 0.18, 0.3), { ramp: STONE_TRIM, at: [0, y - 0.15, 0.1] }),
    part(K.arch(w, h, 0.06), { ramp: ["#e7f3ff", "#c9b9f5"], mat: "glow", at: [0, y, 0] }),
    part(slab(0.06, h, 0.08), { ramp: PAL.wood, at: [0, y, 0.06] }),
    part(slab(w, 0.06, 0.08), { ramp: PAL.wood, at: [0, y + h * 0.42, 0.06] }),
    part(box(w + 0.4, 0.1, 0.4, 0.03), { ramp: STONE_TRIM, at: [0, y - 0.1, 0.18] }),
    ...[-0.5, 0.5].map((dx, i) => part(K.blob(0.16, 70 + i, { detail: 1 }), { ramp: PAL.leaf, at: [dx, y + 0.12, 0.2] })),
  ], -Math.PI / 2).flatMap((p) => K.move(p, [x, 0, z]));
}

const TARGET = { x: 4.7, z: -3.5, y: 2.0 };

function quizTarget() {
  const { x, z, y } = TARGET;
  const face = [
    part(drum(0.62, 0.62, 0.12, { seg: 28 }), { ramp: ["#f3e2b8", "#cfa86a"], rot: [Math.PI / 2, 0, 0] }),
    ...[[0.5, RED], [0.36, ["#ffffff", "#e7e1fb"]], [0.22, RED], [0.09, PAL.gold]].map(([r, c], i) => part(drum(r, r, 0.03, { seg: 24 }), { ramp: c, at: [0, 0, 0.07 + i * 0.012], rot: [Math.PI / 2, 0, 0] })),
  ];
  return [
    ...K.move(K.turn(face, -0.7), [x, y, z]),
    ...[-1, 1].map((s) => part(box(0.08, y + 0.2, 0.08, 0.02), { ramp: PAL.woodDark, at: [x + s * 0.35, 0, z - s * 0.2], rot: [0, -0.7, s * 0.1] })),
    part(box(0.08, y - 0.2, 0.08, 0.02), { ramp: PAL.woodDark, at: [x + 0.25, 0, z + 0.4], rot: [-0.25, -0.7, 0] }),
    // two arrows already in it
    ...[[0.18, 0.12], [-0.1, -0.2]].map(([dx, dy]) => part(drum(0.015, 0.015, 0.6, { seg: 5 }), { ramp: PAL.wood, at: [x - 0.18 + dx, y + dy, z + 0.3], rot: [Math.PI / 2, 0, 0.7] })),
  ];
}

function bookshelf() {
  const x = W / 2 - 0.55, z = 2.8;
  const parts = [part(box(0.7, 3.0, 1.6, 0.04), { ramp: PAL.woodDark, at: [x, 0, z] })];
  const rand = K.rng(41);
  for (let shelf = 0; shelf < 4; shelf++) {
    const y = 0.25 + shelf * 0.7;
    parts.push(part(box(0.62, 0.05, 1.5, 0.01), { ramp: PAL.wood, at: [x - 0.04, y, z] }));
    let dz = -0.65;
    while (dz < 0.6) {
      const t = 0.07 + rand() * 0.06, h = 0.4 + rand() * 0.18;
      parts.push(part(box(0.38, h, t, 0.01), { ramp: [LAV, RED, ["#7fd6b0", "#2f9b72"], ["#9fb4ff", "#4b55c9"], PAL.cream][Math.floor(rand() * 5)], at: [x - 0.1, y + 0.05, z + dz], rot: [rand() < 0.15 ? 0.25 : 0, 0, 0] }));
      dz += t + 0.015;
    }
  }
  return parts;
}

function plants() {
  const pot = (x, z, s, seed) => [
    part(K.lathe([[0, 0], [0.18 * s, 0], [0.22 * s, 0.3 * s], [0.24 * s, 0.34 * s], [0, 0.34 * s]], 14), { ramp: ["#e09868", "#a55a36"], at: [x, 0, z] }),
    ...[0, 1, 2].map((i) => part(K.blob(0.2 * s, seed * 7 + i, { detail: 1 }), { ramp: PAL.leaf, at: [x + (i - 1) * 0.12 * s, 0.5 * s + i * 0.08 * s, z + (i % 2) * 0.08 * s] })),
  ];
  return [...pot(-5.3, -3.75, 1.4, 1), ...pot(2.3, -3.8, 1.1, 2), ...pot(-5.2, 3.6, 1.3, 3)];
}

// ---- the movable bits the app places --------------------------------------------------------

/** One assignment book lying on its back cover, spine toward the student (+z). */
function book() {
  return K.node("book", [
    part(box(0.9, 0.05, 0.66, 0.015), { ramp: LAV, at: [0, 0, 0] }),
    part(box(0.86, 0.14, 0.62, 0.01), { ramp: PAPER, at: [0.02, 0.05, -0.01] }),
    part(box(0.9, 0.05, 0.66, 0.015), { ramp: LAV, at: [0, 0.19, 0] }),
    part(box(0.92, 0.25, 0.06, 0.02), { ramp: ["#7c6ad8", "#4636a0"], at: [0, 0, 0.32] }),
    ...[-0.32, 0.32].map((dx) => part(box(0.06, 0.25, 0.07, 0.01), { ramp: PAL.gold, at: [dx, 0, 0.33] })),
  ], { reach: 0.05 });
}

const gem = (name, ramp, mat) => K.node(name, [part(new THREE.OctahedronGeometry(0.045, 0), { ramp, mat, scale: [1, 1.4, 0.6] })], { reach: 0.01 });

// ---- write ------------------------------------------------------------------------------------

const nodes = [
  K.node("classroom", [floor(), walls(), blackboard(), teacherDesk(), chandelier(), labBench(), bookDesk(), window_(), quizTarget(), bookshelf(), plants()].flat(), { reach: 0.6 }),
  book(),
  gem("gem", PAL.crystal, "glow"),
  gem("gemOff", ["#d9d3ee", "#a59dc2"], "base"),
];

const out = new URL("../../public/game/classroom.glb", import.meta.url).pathname;
console.table(await K.writeGLB(out, nodes));

// Where the app finds things in the room (model space, metres).
const layout = {
  room: { width: W, depth: D, height: H },
  board: { center: BOARD_CENTER, ...BOARD_SIZE },
  stations: {
    materi: { sign: [0, BOARD_CENTER[1] + BOARD_SIZE.height / 2 + 0.75, BACK + 0.6], look: BOARD_CENTER },
    lab: { sign: [LAB.x + 0.3, 2.3, LAB.z + 0.2], look: [LAB.x, 1.2, LAB.z] },
    tugas: { sign: [BOOKS.x, 2.0, BOOKS.z], look: [BOOKS.x, BOOKS.top, BOOKS.z], books: { origin: [BOOKS.x - 0.55, BOOKS.top, BOOKS.z - 0.15], step: [0, 0.27, 0] } },
    quiz: { sign: [TARGET.x - 0.5, TARGET.y + 1.0, TARGET.z + 0.3], look: [TARGET.x, TARGET.y, TARGET.z] },
  },
  camera: { position: [0.6, 2.9, 7.4], target: [0, 1.9, -1.4], fov: 46 },
  window: { x: W / 2 - 0.3, ...WINDOW },
};
const layoutFile = new URL("../../app/features/lms/world3d/classroom-layout.json", import.meta.url).pathname;
writeFileSync(layoutFile, `${JSON.stringify(layout, null, 2)}\n`);
console.log("layout ->", layoutFile);

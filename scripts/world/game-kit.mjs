// anatomy-game kit: build crafted, game-styled 3D assets in code.
//
// Parts are three.js geometries placed in a model's space (y up, ground at
// y = 0, 1 unit ≈ 1 m at toy scale). Each part is painted with a colour or a
// ramp and baked with soft ambient occlusion; parts are merged per material
// and written to one GLB with named nodes (and named child nodes for anything
// that moves: fans, lids, doors, flags). Vertex colours, no textures: assets
// stay small, crisp at any zoom and recolourable.
//
//   import * as K from "./game-kit.mjs";
//   const wall = K.part(K.box(2, 1.6, 1.6), { color: K.PAL.cream, at: [0, 0.3, 0] });
//   await K.writeGLB("out.glb", [K.node("house", [wall, ...])]);

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMaterialsEmissiveStrength } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, quantize } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";

// ---- palette ------------------------------------------------------------------------------
// A cozy-game palette: every colour is a pair (light top, dark bottom) so parts
// read as rounded volumes even under flat light. Swap the values for a brand,
// keep the pairs.
export const PAL = {
  cream: ["#fbf3e2", "#e6d3b3"],
  plaster: ["#f3ecff", "#d6cdf0"],
  wood: ["#c98552", "#8e5530"],
  woodDark: ["#8a5634", "#5a341d"],
  stone: ["#d7d2e6", "#9c95b8"],
  stoneDark: ["#a39cc0", "#6e6792"],
  roof: ["#a594f5", "#5e4ac4"],
  roofAlt: ["#ff9a8b", "#d0574c"],
  grass: ["#9df0c4", "#4cc08a"],
  leaf: ["#6fe0a2", "#1f9466"],
  leafDark: ["#3fbf86", "#126a4a"],
  dirt: ["#c99b72", "#8f6040"],
  cliff: ["#5a52a6", "#2c2770"],
  gold: ["#ffe08a", "#e0a42c"],
  metal: ["#e3e1f0", "#9a97b4"],
  glow: ["#fff1b8", "#ffc75a"],
  crystal: ["#b9fff0", "#3fd6a4"],
  cloud: ["#ffffff", "#e7e1fb"],
  water: ["#a6e8ff", "#4fb4e8"],
  ink: ["#3a3480", "#1d1950"],
};

// ---- randomness ---------------------------------------------------------------------------

/** Deterministic randomness: the same seed builds the same asset every time. */
export function rng(seed = 1) {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---- primitives (origin at the base centre, y up) -----------------------------------------

/** A chunky box with soft edges. Radius defaults to 12% of the smallest side. */
export function box(w, h, d, r = Math.min(w, h, d) * 0.12, seg = Math.max(w, h, d) > 0.6 ? 2 : 1) {
  // Parts this small never show a bevel at a game camera: a plain box is 12 triangles, not 100+.
  // Thin slats (planks, sills, bands) the same: their bevel is narrower than a pixel.
  if (Math.max(w, h, d) < 0.2 || Math.min(w, h, d) < 0.08) return new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2 - 1e-3)).translate(0, h / 2, 0);
}

/** A turned body from [radius, y] points, bottom to top. */
export function lathe(points, seg = 20) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);
}

/** A rounded corner between two lathe points, as extra points. */
function corner(from, at, to, radius, steps = 2) {
  const a = new THREE.Vector2(...from).sub(new THREE.Vector2(...at)).normalize().multiplyScalar(radius).add(new THREE.Vector2(...at));
  const b = new THREE.Vector2(...to).sub(new THREE.Vector2(...at)).normalize().multiplyScalar(radius).add(new THREE.Vector2(...at));
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // quadratic Bézier through the corner: soft, never a sharp crease
    const p = a.clone().multiplyScalar((1 - t) ** 2).add(new THREE.Vector2(...at).multiplyScalar(2 * (1 - t) * t)).add(b.clone().multiplyScalar(t * t));
    out.push([p.x, p.y]);
  }
  return out;
}

/** A cylinder (or tapered drum) with bevelled rims. seg 6 makes a hex prism, pointy along z. */
export function drum(rTop, rBottom, h, { seg = 14, bevel = Math.min(rTop, rBottom, h) * 0.18 } = {}) {
  const pts = [[0, 0], ...corner([0, 0], [rBottom, 0], [rTop, h], bevel), ...corner([rBottom, 0], [rTop, h], [0, h], bevel), [0, h]];
  return lathe(pts, seg);
}

/** A dome: quarter circle (squash < 1 flattens it) on a short lip. */
export function dome(r, { seg = 20, squash = 1, lip = 0.06 } = {}) {
  const pts = [[0, 0], [r, 0], [r, lip]];
  for (let i = 1; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push([Math.cos(a) * r, lip + Math.sin(a) * r * squash]);
  }
  return lathe(pts, seg);
}

/**
 * A storybook cone roof: concave sides, a thick eave that curls out, a little
 * finial ball. flare is how far the eave kicks out (share of r).
 */
export function spire(r, h, { seg = 14, flare = 0.18, thick = Math.max(0.08, r * 0.1), curve = 1.5 } = {}) {
  const pts = [[0, -thick], [r * (1 + flare) - thick * 0.4, -thick], [r * (1 + flare), -thick * 0.3], [r * (1 + flare) * 0.98, 0]];
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    pts.push([r * (1 - t) ** curve, h * t]);
  }
  return lathe(pts, seg);
}

/** Thick gable roof (two slabs and a ridge), over a w × d footprint, eaves at y = 0. */
export function gable(w, d, h, { overhang = 0.22, thick = 0.16 } = {}) {
  const half = w / 2 + overhang;
  const slope = Math.atan2(h, w / 2);
  const len = half / Math.cos(slope);
  const parts = [-1, 1].map((side) => {
    const slab = box(len, thick, d + overhang * 2, thick * 0.45);
    slab.translate(0, -thick / 2, 0);
    slab.rotateZ(side * -slope);
    slab.translate(side * (len / 2) * Math.cos(slope) * 1, h - (len / 2) * Math.sin(slope), 0);
    return slab;
  });
  const ridge = new THREE.CylinderGeometry(thick * 0.75, thick * 0.75, d + overhang * 2.2, 10).rotateX(Math.PI / 2).translate(0, h + thick * 0.15, 0);
  return merge([...parts, ridge.toNonIndexed()]);
}

/** A triangular gable end (the wall under a gable roof), depth t. */
export function gableEnd(w, h, t = 0.18) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }).translate(0, 0, -t / 2);
}

/** An arch outline (rectangle with a round top), as a shape w wide and h tall. */
export function archShape(w, h, inset = 0) {
  const s = new THREE.Shape();
  const r = w / 2 - inset;
  const top = h - w / 2;
  s.moveTo(-r, inset);
  s.lineTo(r, inset);
  s.lineTo(r, top);
  s.absarc(0, top, r, 0, Math.PI, false);
  s.lineTo(-r, inset);
  return s;
}

/** An arched slab (door leaf, window glass), facing +z, depth t. */
export function arch(w, h, t = 0.08, bevel = 0.025) {
  return new THREE.ExtrudeGeometry(archShape(w, h), { depth: t, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 5 }).translate(0, 0, -t / 2);
}

/** An arched frame (ring of width f) around a w × h opening, facing +z. */
export function archFrame(w, h, f = 0.09, t = 0.12) {
  const outer = archShape(w + f * 2, h + f);
  outer.holes.push(archShape(w, h));
  return new THREE.ExtrudeGeometry(outer, { depth: t, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 5 }).translate(0, 0, -t / 2);
}

/** A soft blob (for tree crowns, bushes, clouds), jittered so no two match. */
export function blob(r, seed = 1, { detail = 2, wobble = 0.12, squash = 1 } = {}) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const rand = rng(seed);
  const offsets = new Map();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    if (!offsets.has(key)) offsets.set(key, 1 + (rand() - 0.5) * wobble * 2);
    const k = offsets.get(key);
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * squash, p.getZ(i) * k);
  }
  return smooth(g);
}

/** A faceted rock: chunky, flat-shaded, sitting on y = 0. */
export function rock(r, seed = 1) {
  const g = blob(r, seed, { detail: 1, wobble: 0.22, squash: 0.65 });
  const box3 = new THREE.Box3().setFromBufferAttribute(g.attributes.position);
  return flat(g.translate(0, -box3.min.y - r * 0.15, 0));
}

/** A rounded beam from point a to point b, square section s. */
export function beam(a, b, s = 0.12) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const len = from.distanceTo(to);
  const g = box(s, len, s, s * 0.3).translate(0, -len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  g.applyQuaternion(q);
  const mid = from.clone().add(to).multiplyScalar(0.5);
  return g.translate(mid.x, mid.y, mid.z);
}

export const sphere = (r, seg = 10) => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)));

// ---- composites -----------------------------------------------------------------------------

/**
 * A window that glows at night: arched glass (glow material), a frame, a
 * mullion cross and a sill. Faces +z; place it on a wall's face.
 */
export function windowParts(w, h, { frame = PAL.wood, at = [0, 0, 0], ry = 0, sill = true } = {}) {
  const parts = [
    part(arch(w, h, 0.04), { color: PAL.glow, mat: "glow", at }),
    part(archFrame(w, h, Math.max(0.06, w * 0.14), 0.1), { color: frame, at: [at[0], at[1], at[2] + 0.03] }),
    part(box(0.05, h * 0.92, 0.05, 0.02), { color: frame, at: [at[0], at[1], at[2] + 0.04] }),
    part(box(w, 0.05, 0.05, 0.02), { color: frame, at: [at[0], at[1] + (h - w / 2) * 0.62, at[2] + 0.04] }),
  ];
  if (sill) parts.push(part(box(w + 0.18, 0.07, 0.16, 0.03), { color: frame, at: [at[0], at[1] - 0.07, at[2] + 0.06] }));
  return ry ? parts.map((p) => rotateAround(p, ry)) : parts;
}

/** A planked door with a stone arch, iron straps and a gold knob. Faces +z. */
export function doorParts(w, h, { at = [0, 0, 0], ry = 0 } = {}) {
  const planks = [];
  const n = Math.max(3, Math.round(w / 0.16));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w / n) * (i + 0.5);
    // Planks fill the square part; the arched leaf behind them rounds the top.
    planks.push(part(box(w / n - 0.015, h - w / 2, 0.08, 0.02), { ramp: PAL.wood, at: [at[0] + x, at[1], at[2]] }));
  }
  const parts = [
    part(arch(w, h, 0.06), { color: PAL.woodDark, at: [at[0], at[1], at[2] - 0.04] }),
    ...planks,
    // trim scales with the door, so a cottage door is not all frame
    part(archFrame(w, h, Math.max(0.04, w * 0.2), Math.max(0.06, w * 0.25)), { ramp: PAL.stone, at: [at[0], at[1], at[2] + 0.02] }),
    part(box(w * 0.95, w * 0.08, 0.03, 0.01), { color: PAL.ink, at: [at[0], at[1] + h * 0.25, at[2] + 0.05] }),
    part(box(w * 0.95, w * 0.08, 0.03, 0.01), { color: PAL.ink, at: [at[0], at[1] + h * 0.6, at[2] + 0.05] }),
    part(sphere(Math.max(0.02, w * 0.07), 6), { color: PAL.gold, at: [at[0] + w * 0.28, at[1] + h * 0.42, at[2] + 0.07] }),
    part(box(w * 1.45, Math.max(0.04, w * 0.15), w * 0.6, 0.02), { ramp: PAL.stone, at: [at[0], at[1] - Math.max(0.04, w * 0.15), at[2] + w * 0.2] }),
  ];
  return ry ? parts.map((p) => rotateAround(p, ry)) : parts;
}

/** Stones set into a wall's face (a game wall is never a bare plane), facing +z. */
export function stoneCourses(w, h, { at = [0, 0, 0], seed = 3, density = 0.35, size = 0.22 } = {}) {
  const rand = rng(seed);
  const out = [];
  for (let y = size * 0.6; y < h - size * 0.4; y += size * 0.9) {
    for (let x = -w / 2 + size * 0.6; x < w / 2 - size * 0.5; x += size * 1.3) {
      if (rand() > density) continue;
      const sw = size * (0.9 + rand() * 0.7), sh = size * (0.55 + rand() * 0.3);
      out.push(part(box(sw, sh, 0.06, sh * 0.35), { ramp: rand() < 0.5 ? PAL.stone : PAL.stoneDark, at: [at[0] + x + (rand() - 0.5) * 0.08, at[1] + y, at[2]] }));
    }
  }
  return out;
}

/** A pine with three drooping tiers, widest at the bottom, each a soft skirt with a rolled rim. */
export function pine(h = 1.6, seed = 1) {
  const rand = rng(seed);
  const trunkH = h * 0.2;
  const parts = [part(drum(h * 0.045, h * 0.065, trunkH + h * 0.12, { seg: 7 }), { ramp: PAL.woodDark })];
  const tiers = [
    { r: 0.4, y: 0.16, th: 0.36 },
    { r: 0.31, y: 0.4, th: 0.32 },
    { r: 0.21, y: 0.62, th: 0.36 },
  ];
  tiers.forEach((t, i) => {
    const r = h * t.r, th = h * t.th;
    // skirt: a rolled rim that droops below the tier, then a concave rise to the tip
    const g = lathe([[0, -th * 0.12], [r * 0.7, -th * 0.12], [r * 0.98, -th * 0.08], [r, 0], [r * 0.82, th * 0.1], [r * 0.5, th * 0.4], [r * 0.24, th * 0.72], [0, th]], 10);
    parts.push(part(g, { ramp: i === 1 ? PAL.leaf : PAL.leafDark, at: [0, h * t.y + trunkH * 0.5, 0], rot: [(rand() - 0.5) * 0.06, rand() * 6, (rand() - 0.5) * 0.06] }));
  });
  return parts;
}

/** A round-crowned tree: trunk and a cluster of blobs. */
export function roundTree(h = 1.6, seed = 1) {
  const rand = rng(seed);
  const parts = [part(drum(h * 0.06, h * 0.09, h * 0.45, { seg: 8 }), { ramp: PAL.wood })];
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand();
    const r = h * (0.22 + rand() * 0.08);
    parts.push(part(blob(r, seed * 7 + i, { detail: 1, wobble: 0.1 }), { ramp: PAL.leaf, at: [Math.cos(a) * h * 0.14, h * (0.62 + rand() * 0.12), Math.sin(a) * h * 0.14] }));
  }
  parts.push(part(blob(h * 0.27, seed * 13, { detail: 1 }), { ramp: PAL.leaf, at: [0, h * 0.82, 0] }));
  return parts;
}

/** A cloud: overlapping blobs on a flat-ish bottom. */
export function cloud(size = 1, seed = 1) {
  const rand = rng(seed);
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * size * 0.42 + (rand() - 0.5) * 0.1;
    const r = size * (0.36 + (1 - Math.abs(i - 2) / 2) * 0.22 + rand() * 0.08);
    parts.push(part(blob(r, seed + i, { detail: 2, wobble: 0.05, squash: 0.82 }), { ramp: PAL.cloud, at: [x, r * 0.5, (rand() - 0.5) * size * 0.3], ao: false }));
  }
  return parts;
}

/**
 * A hex island tile, pointy along z, top at y = 0: a grass cap with a soft lip
 * that overhangs the dirt, then two rock strata. r is the circumradius.
 */
export function hexTile(r = 1, { depth = 1, grass = PAL.grass, seed = 1, seamless = false, tufts = 3 } = {}) {
  const rand = rng(seed);
  // seamless: tiles laid edge to edge read as one ground (an island); otherwise
  // each tile is its own chunky piece with a lip over the dirt (a board game).
  const lip = seamless ? 0 : r * 0.04;
  const cap = seamless
    ? flat(lathe([[0, -0.22], [r, -0.22], [r, -0.03], [r * 0.985, 0], [0, 0]], 6))
    : flat(lathe([[0, -0.22], [r * 0.99, -0.22], [r + lip, -0.16], [r + lip, -0.04], [r * 0.97, 0], [0, 0]], 6));
  const inset = seamless ? 1 : 0.97;
  const dirt = flat(lathe([[0, -0.5], [r * inset, -0.5], [r * inset, -0.22], [0, -0.22]], 6));
  const strata = flat(lathe([[0, -depth], [r * inset * (seamless ? 1 : 0.93), -depth], [r * inset, -0.5], [0, -0.5]], 6));
  const out = [part(cap, { ramp: grass }), part(dirt, { ramp: PAL.dirt }), part(strata, { ramp: PAL.cliff })];
  for (let i = 0; i < tufts; i++) {
    const a = rand() * Math.PI * 2, d = rand() * r * 0.6;
    out.push(part(blob(r * 0.07, seed * 3 + i, { detail: 0, wobble: 0.2, squash: 1.4 }), { ramp: PAL.leaf, at: [Math.cos(a) * d, 0.02, Math.sin(a) * d] }));
  }
  return out;
}

// ---- parts: paint and place -------------------------------------------------------------

const toLinear = (c) => new THREE.Color(c);

/**
 * A painted part. Options:
 *   color  one colour, or a [light, dark] pair used as a ramp
 *   ramp   [light, dark]: light at the part's top, dark at its bottom
 *   mat    "base" (default) or "glow" (emissive: windows, crystals, lamps)
 *   at, rot ([x,y,z] radians), scale (number or [x,y,z])
 *   flat   flat shading (rocks, hex sides); default keeps the geometry's normals
 *   ao     false to skip the ground occlusion bake (clouds, things in the air)
 */
export function part(geometry, { color, ramp, mat = "base", at = [0, 0, 0], rot = [0, 0, 0], scale = 1, flat: isFlat = false, ao = true } = {}) {
  let g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  if (isFlat) g = flat(g);
  if (!g.attributes.normal) g.computeVertexNormals();
  for (const name of Object.keys(g.attributes)) if (!["position", "normal"].includes(name)) g.deleteAttribute(name);
  const pair = ramp ?? (Array.isArray(color) ? color : [color ?? "#ffffff", color ?? "#ffffff"]);
  const light = toLinear(pair[0]), dark = toLinear(pair[1]);
  g.computeBoundingBox();
  const { min, max } = g.boundingBox;
  const span = Math.max(1e-6, max.y - min.y);
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.copy(dark).lerp(light, (p.getY(i) - min.y) / span);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const s = typeof scale === "number" ? [scale, scale, scale] : scale;
  g.scale(...s);
  g.rotateX(rot[0]).rotateY(rot[1]).rotateZ(rot[2]);
  g.translate(...at);
  return { geometry: g, mat, ao };
}

/** Moves a part (or a list of parts) by [x, y, z]. */
export function move(parts, at) {
  return [parts].flat().map((p) => ({ ...p, geometry: p.geometry.clone().translate(...at) }));
}

/** Turns a part around the y axis through the origin. */
export function rotateAround(p, ry) {
  return { ...p, geometry: p.geometry.clone().rotateY(ry) };
}

/** Turns parts around the y axis through the origin. */
export function turn(parts, ry) {
  return [parts].flat().map((p) => rotateAround(p, ry));
}

export function flat(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.deleteAttribute("normal");
  g.computeVertexNormals();
  return g;
}

export function smooth(geometry) {
  const g = mergeVertices(geometry.index ? geometry.toNonIndexed() : geometry, 1e-4);
  g.deleteAttribute("normal");
  g.computeVertexNormals();
  return g;
}

function merge(geometries) {
  const list = geometries.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(n.attributes)) if (!["position", "normal"].includes(name)) n.deleteAttribute(name);
    if (!n.attributes.normal) n.computeVertexNormals();
    return n;
  });
  return mergeGeometries(list, false);
}

// ---- occlusion bake ------------------------------------------------------------------------

/**
 * Soft ambient occlusion baked into the vertex colours: contact shadow near
 * the ground, darker undersides (eaves, overhangs), a touch of light on tops.
 * Cheap, and it is most of what makes a toy model look grounded.
 */
function bake(p, { ground = 0, reach = 0.45, floor = 0.55 } = {}) {
  if (!p.ao) return p;
  const g = p.geometry;
  const pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) - ground;
    const t = Math.min(1, Math.max(0, y / reach));
    let k = floor + (1 - floor) * (t * t * (3 - 2 * t));
    const ny = nor.getY(i);
    if (ny < -0.35) k *= 0.78;
    else if (ny > 0.75) k *= 1.06;
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
  return p;
}

// ---- nodes and export --------------------------------------------------------------------

/**
 * A named model. children are moving sub-parts: { name, pivot: [x,y,z], parts }
 * with parts in the model's space; the child's origin is moved to its pivot so
 * the app can rotate it (a fan around its hub, a lid around its hinge).
 */
export function node(name, parts, { children = [], ground = 0, reach = 0.45 } = {}) {
  return { name, parts: parts.flat().map((p) => bake(p, { ground, reach })), children: children.map((c) => ({ ...c, parts: c.parts.flat().map((p) => bake(p, { ground, reach })) })) };
}

export function stats(nodes) {
  return nodes.map((n) => {
    const tris = [...n.parts, ...n.children.flatMap((c) => c.parts)].reduce((sum, p) => sum + p.geometry.attributes.position.count / 3, 0);
    return { name: n.name, triangles: Math.round(tris), parts: n.parts.length + n.children.reduce((s, c) => s + c.parts.length, 0) };
  });
}

/** Writes nodes to a GLB: one mesh per node and material, vertex colours, quantized + meshopt. */
export async function writeGLB(file, nodes, { compress = true, glowStrength = 1.8 } = {}) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene("scene");
  const materials = {
    base: doc.createMaterial("base").setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.82).setMetallicFactor(0),
    glow: doc.createMaterial("glow").setBaseColorFactor([1, 1, 1, 1]).setEmissiveFactor([1, 1, 1]).setRoughnessFactor(0.5).setMetallicFactor(0),
  };
  const strength = doc.createExtension(KHRMaterialsEmissiveStrength).createEmissiveStrength().setEmissiveStrength(glowStrength);
  materials.glow.setExtension("KHR_materials_emissive_strength", strength);

  const meshOf = (name, parts, offset = [0, 0, 0]) => {
    const mesh = doc.createMesh(name);
    for (const mat of Object.keys(materials)) {
      const list = parts.filter((p) => p.mat === mat).map((p) => p.geometry.clone().translate(-offset[0], -offset[1], -offset[2]));
      if (!list.length) continue;
      const merged = mergeVertices(mergeGeometries(list, false), 1e-5);
      const prim = doc.createPrimitive().setMaterial(materials[mat]);
      prim.setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(merged.attributes.position.array)).setBuffer(buffer));
      prim.setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(merged.attributes.normal.array)).setBuffer(buffer));
      prim.setAttribute("COLOR_0", doc.createAccessor().setType("VEC3").setArray(new Float32Array(merged.attributes.color.array)).setBuffer(buffer));
      prim.setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(merged.index.array)).setBuffer(buffer));
      mesh.addPrimitive(prim);
    }
    return mesh;
  };

  // Meshes hang on their own leaf nodes: quantization writes its decode
  // transform onto the node that holds the mesh, and the named node (the one
  // the app finds, instances or rotates) must keep a clean transform.
  const holder = (name, mesh) => doc.createNode(`${name}_mesh`).setMesh(mesh);
  for (const n of nodes) {
    const root = doc.createNode(n.name).addChild(holder(n.name, meshOf(n.name, n.parts)));
    for (const child of n.children) {
      const pivot = child.pivot ?? [0, 0, 0];
      root.addChild(doc.createNode(child.name).setTranslation(pivot).addChild(holder(child.name, meshOf(child.name, child.parts, pivot))));
    }
    scene.addChild(root);
  }

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
  await doc.transform(dedup(), prune(), ...(compress ? [meshopt({ encoder: MeshoptEncoder, level: "medium" })] : [quantize()]));
  await io.write(file, doc);
  return stats(nodes);
}

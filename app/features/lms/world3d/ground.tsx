import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { rng } from "./kit";
import { hex, TILE, type Tile, type Vec3 } from "./layout";

// The floating ground of an island (after the paintover in docs/world-concept):
// one organic landmass whose grass lip overhangs a soil band, then layered navy
// rock in strata with ledges and rounded columns, tapering into a long root like
// an upside-down mountain. Roots and mint vines hang from the soil, a spring
// falls from a cave mouth, a few rocks float beside it, and the haze glows under
// the root. Built in the browser from the island's tiles and seed.

/** Reduced motion: clouds, islets, rocks and water hold still. */
export const STILL = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SUN = new THREE.Vector2(16, 12).normalize();
const C = {
  grassTop: "#a8f0c8",
  grass: "#5fd09b",
  grassSide: "#3aa874",
  lipShadow: "#2b7a59",
  dirt: "#b98a66",
  dirtDark: "#8a6450",
  rockTop: "#6b62c4",
  rockBottom: "#191550",
  warm: "#ffd9b8",
};

export type IslandShape = {
  geometry: THREE.BufferGeometry;
  /** Edge of the grass, unit directions times radius, counter-clockwise. */
  outline: [number, number][];
  depth: number;
  /** Bottom of the root. */
  tip: Vec3;
  /** Width and height of the cliff at depth fraction t (0 top of rock, 1 tip). */
  at: (k: number, t: number) => Vec3;
};

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function islandShape(tiles: Tile[], seed: number, { segments = 96 }: { segments?: number } = {}): IslandShape {
  const rand = rng(seed);
  const N = segments;
  const centers = tiles.map((tile) => hex(tile));
  const reach = 1.1547 * TILE * 0.98;
  const phase = [rand() * 6, rand() * 6];
  const outline: [number, number][] = [];
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    let r = 0;
    for (const [x, , z] of centers) r = Math.max(r, x * dx + z * dz);
    r += reach;
    r *= 1 + 0.035 * Math.sin(3 * a + phase[0]!) + 0.02 * Math.sin(5 * a + phase[1]!);
    outline.push([dx * r, dz * r]);
  }
  const width = Math.max(...outline.map(([x, z]) => Math.hypot(x, z)));
  const depth = 2.4 + width * 0.9;
  const lean: [number, number] = [(rand() - 0.5) * width * 0.35, (rand() - 0.5) * width * 0.35];
  const rockTop = -0.5;

  // The cliff's reach at fraction t: wide under the soil, tapering to the root,
  // with rounded columns (shared down a band, so they read vertical).
  const profile = (t: number) => 0.97 * (1 - Math.pow(t, 1.25)) ** 0.9;
  const columnOf = (k: number, band: number, t: number) => {
    const column = Math.floor(k / 3);
    const n = hash(column, seed % 97) * 0.7 + hash(column, band + 11) * 0.3;
    return 1 + (n - 0.5) * (0.1 + t * 0.22);
  };
  const at = (k: number, t: number): Vec3 => {
    const [x, z] = outline[((k % N) + N) % N]!;
    const s = profile(t);
    const bend = t * t;
    return [x * s + lean[0] * bend, rockTop - depth * Math.pow(t, 0.92), z * s + lean[1] * bend];
  };

  type Ring = { scale: number; y: number; color: string; shade?: number; band?: number; t?: number; ledge?: number };
  const rings: Ring[] = [
    { scale: 0, y: 0.02, color: C.grassTop },
    { scale: 0.93, y: 0, color: C.grass },
    { scale: 0.995, y: -0.04, color: C.grass },
    { scale: 1.035, y: -0.13, color: C.grassSide },
    { scale: 1.03, y: -0.2, color: C.grassSide },
    { scale: 0.99, y: -0.25, color: C.lipShadow },
    { scale: 0.975, y: -0.28, color: C.dirt },
    { scale: 0.97, y: -0.46, color: C.dirtDark },
  ];
  const BANDS = 7;
  for (let b = 0; b < BANDS; b++) {
    const t0 = b / BANDS, t1 = (b + 1) / BANDS;
    const tone = new THREE.Color(C.rockTop).lerp(new THREE.Color(C.rockBottom), Math.pow(t0, 0.8));
    const alt = b % 2 ? 0.84 : 1.08;
    const hexTone = `#${tone.multiplyScalar(alt).getHexString()}`;
    // a lit ledge on top of the band, a dark crease under it, then the band's face
    rings.push({ scale: 1.05, y: 0, color: hexTone, shade: 1.18, band: b, t: t0, ledge: 1 });
    rings.push({ scale: 1.0, y: -0.06, color: hexTone, shade: 0.72, band: b, t: t0 + 0.012 });
    rings.push({ scale: 1.0, y: 0, color: hexTone, shade: 0.95, band: b, t: (t0 + t1) / 2 });
    if (b === BANDS - 1) rings.push({ scale: 0, y: 0, color: C.rockBottom, band: b, t: 1 });
  }

  const positions: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  const color = new THREE.Color();
  const warm = new THREE.Color(C.warm);
  rings.forEach((r, ri) => {
    for (let k = 0; k < N; k++) {
      const [x, z] = outline[k]!;
      const len = Math.hypot(x, z) || 1;
      const light = (x / len) * SUN.x + (z / len) * SUN.y;
      color.set(r.color);
      if (r.t === undefined) {
        positions.push(x * r.scale, r.y, z * r.scale);
        if (ri >= 3) color.multiplyScalar(0.92 + Math.max(0, light) * 0.16);
      } else {
        const [px, py, pz] = at(k, r.t);
        const c = r.t >= 1 ? 1 : columnOf(k, r.band!, r.t) * r.scale;
        const cx = lean[0] * r.t * r.t, cz = lean[1] * r.t * r.t;
        positions.push(cx + (px - cx) * c, py + r.y + (r.ledge ? (hash(k, r.band!) - 0.5) * 0.1 : 0), cz + (pz - cz) * c);
        // sun side lighter with a warm edge; the far side falls into lavender shade
        color.multiplyScalar((r.shade ?? 1) * (0.74 + Math.max(0, light) * 0.5));
        if (r.ledge && light > 0.3) color.lerp(warm, 0.12 * light);
      }
      colors.push(color.r, color.g, color.b);
    }
  });
  for (let r = 0; r < rings.length - 1; r++) {
    for (let k = 0; k < N; k++) {
      const a = r * N + k, b = r * N + ((k + 1) % N);
      const c = (r + 1) * N + k, d = (r + 1) * N + ((k + 1) % N);
      index.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return { geometry, outline, depth, tip: [lean[0], rockTop - depth, lean[1]], at };
}

/** An island's ground: the landmass, and on a full island its dressing. */
export function HexBoard({ tiles, seed, ghost = false, dressing = "none" }: { tiles: Tile[]; seed: number; ghost?: boolean; dressing?: "none" | "light" | "full" }) {
  const shape = useMemo(() => islandShape(tiles, seed), [tiles, seed]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, transparent: ghost, opacity: ghost ? 0.55 : 1 }), [ghost]);
  return (
    <>
      <mesh geometry={shape.geometry} material={material} castShadow receiveShadow />
      {dressing !== "none" && <Dressing shape={shape} seed={seed} full={dressing === "full"} />}
    </>
  );
}

// ---- dressing ----------------------------------------------------------------------------

/** Faces the camera sees (it looks from +x +z): where dressing is worth its triangles. */
const facing = (x: number, z: number) => (x + z) / (Math.hypot(x, z) * Math.SQRT2 || 1);

function Dressing({ shape, seed, full }: { shape: IslandShape; seed: number; full: boolean }) {
  return (
    <>
      <Hanging shape={shape} seed={seed} count={full ? 16 : 7} />
      <Chunks shape={shape} seed={seed} count={full ? 5 : 2} />
      {full && <Waterfall shape={shape} seed={seed} />}
      <Glow shape={shape} />
    </>
  );
}

function colored(geometry: THREE.BufferGeometry, hexColor: string) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const c = new THREE.Color(hexColor);
  const n = g.attributes.position!.count;
  g.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: n }, () => [c.r, c.g, c.b]).flat(), 3));
  g.deleteAttribute("uv");
  return g;
}

/** Roots and mint vines hanging from the soil band, mostly on the side the camera sees. */
function Hanging({ shape, seed, count }: { shape: IslandShape; seed: number; count: number }) {
  const geometry = useMemo(() => {
    const rand = rng(seed + 401);
    const N = shape.outline.length;
    const parts: THREE.BufferGeometry[] = [];
    let made = 0;
    for (let tries = 0; made < count && tries < count * 6; tries++) {
      const k = Math.floor(rand() * N);
      const [x, z] = shape.outline[k]!;
      if (facing(x, z) < -0.2 && rand() < 0.8) continue;
      made++;
      const vine = rand() < 0.45;
      const len = (vine ? 0.9 : 0.6) + rand() * (vine ? 1.6 : 1.0);
      const out = new THREE.Vector3(x, 0, z).normalize();
      const start = new THREE.Vector3(x * 0.985, vine ? -0.16 : -0.4, z * 0.985);
      const sway = (rand() - 0.5) * 0.3;
      const pts = [0, 0.33, 0.66, 1].map((t) => start.clone().add(new THREE.Vector3(out.x * (0.06 + t * 0.12) + sway * t * out.z, -len * t, out.z * (0.06 + t * 0.12) - sway * t * out.x)));
      const curve = new THREE.CatmullRomCurve3(pts);
      parts.push(colored(new THREE.TubeGeometry(curve, 6, vine ? 0.026 : 0.034, 4), vine ? "#3fbf8c" : "#6e4f3e"));
      if (vine) {
        for (let i = 1; i <= 3; i++) {
          const p = curve.getPointAt(i / 4);
          parts.push(colored(new THREE.IcosahedronGeometry(0.07, 0).scale(1, 0.6, 1).translate(p.x, p.y, p.z), i % 2 ? "#4bd29f" : "#36a979"));
        }
      }
    }
    return mergeGeometries(parts)!;
  }, [shape, seed, count]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), []);
  return <mesh geometry={geometry} material={material} castShadow />;
}

/** A small rock with a grass cap: the shape of the island in miniature. */
export function isletGeometry(seed = 77, haze = 0) {
  const rand = rng(seed);
  const N = 14;
  const rings: [number, number, string][] = [
    [0, 0.06, C.grassTop], [0.88, 0.02, C.grass], [1.03, -0.08, C.grassSide], [0.96, -0.18, C.dirt],
    [1.04, -0.24, C.rockTop], [0.98, -0.3, "#3f378c"], [0.9, -0.62, "#4c44a2"], [0.94, -0.66, "#5b53ad"],
    [0.84, -0.72, "#342d7c"], [0.62, -1.1, "#3a3389"], [0.4, -1.5, "#28226a"], [0.16, -1.9, "#211c5c"], [0, -2.15, C.rockBottom],
  ];
  const fog = new THREE.Color("#e3dbfb");
  const positions: number[] = [], colors: number[] = [], index: number[] = [];
  const color = new THREE.Color();
  rings.forEach(([s, y, hexColor], r) => {
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      const n = r > 3 ? 1 + (Math.sin(k * 1.7 + seed) * 0.5 + rand() - 0.5) * 0.28 : 1 + Math.sin(k * 0.9 + seed) * 0.06;
      positions.push(Math.cos(a) * s * n, y, Math.sin(a) * s * n);
      const light = Math.cos(a) * SUN.x + Math.sin(a) * SUN.y;
      color.set(hexColor).multiplyScalar(r > 2 ? 0.8 + Math.max(0, light) * 0.35 : 1).lerp(fog, haze);
      colors.push(color.r, color.g, color.b);
    }
  });
  for (let r = 0; r < rings.length - 1; r++) {
    for (let k = 0; k < N; k++) {
      const a = r * N + k, b = r * N + ((k + 1) % N), c = (r + 1) * N + k, d = (r + 1) * N + ((k + 1) % N);
      index.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** A few rocks that float beside the island, bobbing slowly. */
function Chunks({ shape, seed, count }: { shape: IslandShape; seed: number; count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => isletGeometry(seed + 5), [seed]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), []);
  const spots = useMemo(() => {
    const rand = rng(seed + 23);
    const N = shape.outline.length;
    return Array.from({ length: count }, (_, i) => {
      // spread round the visible side, below and a little outside the rim
      // the camera looks from +x +z: angles from about -40 to 130 degrees
      const k = Math.floor((((-0.11 + ((i + 0.5) / count) * 0.47 + (rand() - 0.5) * 0.04) % 1) + 1) % 1 * N);
      const t = 0.06 + rand() * 0.3;
      const [x, y, z] = shape.at(k, t);
      const out = 1.35 + rand() * 0.3;
      return { p: new THREE.Vector3(x * out, y + 0.3, z * out), s: 0.12 + rand() * 0.14, ry: rand() * 6, phase: rand() * 6 };
    });
  }, [shape, seed, count]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const time = STILL ? 0 : clock.elapsedTime;
    spots.forEach((spot, i) => {
      const bob = Math.sin(time * 0.6 + spot.phase) * 0.12;
      q.setFromEuler(new THREE.Euler(0, spot.ry + time * 0.04, 0));
      m.compose(spot.p.clone().setY(spot.p.y + bob), q, new THREE.Vector3().setScalar(spot.s * 2.2));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  useLayoutEffect(() => {
    ref.current?.computeBoundingSphere();
  });
  return <instancedMesh ref={ref} args={[geometry, material, count]} castShadow frustumCulled={false} />;
}

/** A spring from a cave mouth under the lip, falling down the cliff into mist. */
function Waterfall({ shape, seed }: { shape: IslandShape; seed: number }) {
  const { ribbon, mouth, mist } = useMemo(() => {
    const N = shape.outline.length;
    // front left as the camera sees it
    let best = 0, bestScore = -Infinity;
    for (let k = 0; k < N; k++) {
      const [x, z] = shape.outline[k]!;
      const a = Math.atan2(z, x);
      const score = -Math.abs(a - 1.35) + (seed % 3) * 0.01;
      if (score > bestScore) { bestScore = score; best = k; }
    }
    const [ox, oz] = shape.outline[best]!;
    const out = new THREE.Vector3(ox, 0, oz).normalize();
    const side = new THREE.Vector3(-out.z, 0, out.x);
    const rows = 14;
    const positions: number[] = [], uvs: number[] = [], index: number[] = [];
    const top = 0.02, bottom = 0.78;
    for (let i = 0; i <= rows; i++) {
      const v = i / rows;
      const t = top + (bottom - top) * v;
      const [x, y, z] = shape.at(best, t);
      const lift = 0.2 + v * v * 1.2;
      const w = 0.48 + v * 0.42;
      const c = new THREE.Vector3(x, y, z).addScaledVector(out, lift);
      if (i === 0) c.y = -0.52;
      for (const s of [-1, 1]) {
        const p = c.clone().addScaledVector(side, s * w);
        positions.push(p.x, p.y, p.z);
        uvs.push(s < 0 ? 0 : 1, v);
      }
      if (i < rows) {
        const a = i * 2;
        index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index);
    const [mx, , mz] = shape.at(best, top);
    const end = shape.at(best, bottom);
    const endOut = new THREE.Vector3(...end).addScaledVector(out, 1.06);
    return {
      ribbon: geometry,
      mouth: { p: new THREE.Vector3(mx, -0.5, mz).addScaledVector(out, 0.04), ry: Math.atan2(out.x, out.z) },
      mist: endOut,
    };
  }, [shape, seed]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { time: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float time;
          varying vec2 vUv;
          void main() {
            float streak = fract(vUv.y * 5.0 - time * 1.4 + sin(vUv.x * 19.0) * 0.18);
            float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
            vec3 c = mix(vec3(0.62, 0.86, 1.0), vec3(1.0), smoothstep(0.55, 0.9, streak) * 0.85 + (1.0 - edge) * 0.4);
            float a = edge * smoothstep(1.0, 0.7, vUv.y) * (0.82 + 0.18 * streak);
            gl_FragColor = vec4(c, a);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );
  useFrame(({ clock }) => {
    material.uniforms.time!.value = STILL ? 0 : clock.elapsedTime;
  });
  return (
    <>
      <mesh geometry={ribbon} material={material} renderOrder={2} />
      <mesh position={mouth.p} rotation={[0, mouth.ry, 0]}>
        <circleGeometry args={[0.36, 12]} />
        <meshBasicMaterial color="#120f3a" />
      </mesh>
      <sprite position={mist} scale={[2.2, 1.4, 1]}>
        <spriteMaterial map={softDot()} color="#ffffff" transparent depthWrite={false} opacity={0.8} />
      </sprite>
    </>
  );
}

let dot: THREE.Texture | null = null;
/** A soft round glow, painted once. */
function softDot() {
  if (dot) return dot;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  dot = new THREE.CanvasTexture(canvas);
  dot.colorSpace = THREE.SRGBColorSpace;
  return dot;
}

/** The haze glows softly behind the root, so the island floats in light, not on a void. */
function Glow({ shape }: { shape: IslandShape }) {
  const [x, y, z] = shape.tip;
  const size = shape.depth * 1.5;
  return (
    <sprite position={[x - 6, y + shape.depth * 0.35 - 6, z - 6]} scale={[size * 1.4, size, 1]} renderOrder={-1}>
      <spriteMaterial map={softDot()} color="#f4eeff" transparent depthWrite={false} opacity={0.55} fog={false} />
    </sprite>
  );
}

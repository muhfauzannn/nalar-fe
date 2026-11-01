import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";

import { hex, ring, TILE, type Tile, type Vec3 } from "./layout";

// The world's models are KayKit packs (CC0, Kay Lousberg; licence in
// public/game/KAYKIT-LICENSE.txt), packed into one GLB with Bernalar's lavender
// roofs and mint grass by scripts/build-world-assets.mjs. Each model is a
// root node named by its key: castle, church, windmill, archery, hex, trees…
export const KIT_URL = "/game/world.glb";

export function preloadKit() {
  useGLTF.preload(KIT_URL, false, true);
}

/** The root object of one packed model, by its key. */
export function useKit() {
  const { scene } = useGLTF(KIT_URL, false, true);
  return useMemo(() => {
    scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return (key: string) => {
      const node = scene.getObjectByName(key);
      if (!node) throw new Error(`world.glb has no ${key}`);
      return node;
    };
  }, [scene]);
}

export type Placed = { p: Vec3; ry?: number; s?: number };

// Deterministic randomness so the world is the same on every visit.
export function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function seedOf(text: string) {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function Piece({ name, position = [0, 0, 0], ry = 0, scale = TILE, children }: { name: string; position?: Vec3; ry?: number; scale?: number; children?: ReactNode }) {
  const kit = useKit();
  const object = useMemo(() => kit(name).clone(true), [kit, name]);
  return (
    <group position={position} rotation={[0, ry, 0]} scale={scale}>
      <primitive object={object} />
      {children}
    </group>
  );
}

type Part = { geometry: THREE.BufferGeometry; material: THREE.Material; local: THREE.Matrix4 };

/** Many copies of one model as one draw call per mesh inside it. */
export function Instanced({ name, items, scale = TILE }: { name: string; items: Placed[]; scale?: number }) {
  const kit = useKit();
  const parts = useMemo(() => {
    const node = kit(name);
    node.updateWorldMatrix(true, true);
    const inverse = node.matrixWorld.clone().invert();
    const out: Part[] = [];
    node.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) out.push({ geometry: mesh.geometry, material: mesh.material as THREE.Material, local: inverse.clone().multiply(mesh.matrixWorld) });
    });
    return out;
  }, [kit, name]);
  if (items.length === 0) return null;
  return (
    <>
      {parts.map((part, index) => (
        <InstancedPart key={index} part={part} items={items} scale={scale} />
      ))}
    </>
  );
}

function InstancedPart({ part, items, scale }: { part: Part; items: Placed[]; scale: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const m = new THREE.Matrix4();
    items.forEach((item, index) => {
      m.compose(new THREE.Vector3(...item.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, item.ry ?? 0, 0)), new THREE.Vector3().setScalar((item.s ?? 1) * scale));
      mesh.setMatrixAt(index, m.multiply(part.local));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, part, scale]);
  return <instancedMesh key={items.length} ref={ref} args={[part.geometry, part.material, items.length]} castShadow receiveShadow />;
}

// Ramps for the island body, top to bottom (sRGB; converted to linear below).
const GROUND = {
  grassTop: "#a8f0c8",
  grass: "#5fd09b",
  grassSide: "#3aa874",
  dirt: "#b98a66",
  rockTop: "#5a51a8",
  rockBottom: "#1f1b55",
};

/**
 * The island as one organic landmass (after the concept art), not tiles: a soft
 * grass cap with a rounded lip over the outline of the board's tiles, a dirt
 * band, then layered rock cliffs with chunky vertical columns that taper into a
 * floating root. Built once per island in the browser from its tiles and seed.
 */
function islandGeometry(tiles: Tile[], seed: number) {
  const rand = rng(seed);
  const centers = tiles.map((tile) => hex(tile));
  const N = 96;
  const reach = 1.1547 * TILE * 0.98;
  const phase = [rand() * 6, rand() * 6, rand() * 6];
  const outline: [number, number][] = [];
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    // the board's support in this direction, softened, with a gentle wobble
    let r = 0;
    for (const [x, , z] of centers) r = Math.max(r, x * dx + z * dz);
    r += reach;
    r *= 1 + 0.035 * Math.sin(3 * a + phase[0]!) + 0.02 * Math.sin(5 * a + phase[1]!);
    outline.push([dx * r, dz * r]);
  }
  // rings from the top down: [scale, y, jag (rock columns), colour]
  const radius = Math.max(3, ...tiles.map(ring));
  const depth = 2.2 + radius * 1.1;
  const rings: [number, number, number, string][] = [
    [0.0, 0.0, 0, GROUND.grassTop],
    [0.94, 0.0, 0, GROUND.grass],
    [0.995, -0.05, 0, GROUND.grass],
    [1.01, -0.16, 0, GROUND.grassSide],
    [0.99, -0.3, 0, GROUND.grassSide],
    [0.975, -0.34, 0, GROUND.dirt],
    [0.965, -0.6, 0.02, GROUND.dirt],
    [0.95, -0.66, 0.05, GROUND.rockTop],
    [0.9, -0.66 - depth * 0.22, 0.07, GROUND.rockTop],
    [0.78, -0.66 - depth * 0.42, 0.09, "#463e96"],
    [0.58, -0.66 - depth * 0.62, 0.1, "#342d7c"],
    [0.32, -0.66 - depth * 0.82, 0.1, "#28226a"],
    [0.0, -0.66 - depth, 0, GROUND.rockBottom],
  ];
  const positions: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  const color = new THREE.Color();
  rings.forEach(([scale, y, jag, hexColor], ringIndex) => {
    color.set(hexColor);
    for (let k = 0; k < N; k++) {
      const [x, z] = outline[k]!;
      // rock columns: neighbouring vertices share a column every 4 steps
      const column = Math.floor(k / 4);
      const n = jag ? 1 + jag * (Math.sin(column * 12.9898 + ringIndex * 78.233 + seed) * 0.5 + Math.sin(column * 3.1 + ringIndex) * 0.5) : 1;
      positions.push(x * scale * n, y + (jag ? (rand() - 0.5) * 0.12 : 0), z * scale * n);
      colors.push(color.r, color.g, color.b);
    }
  });
  for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex++) {
    for (let k = 0; k < N; k++) {
      const a = ringIndex * N + k, b = ringIndex * N + ((k + 1) % N);
      const c = (ringIndex + 1) * N + k, d = (ringIndex + 1) * N + ((k + 1) % N);
      index.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** An island's ground from its tiles (the tiles only place things; the ground is one shape). */
export function HexBoard({ tiles, seed, ghost = false }: { tiles: Tile[]; seed: number; ghost?: boolean }) {
  const geometry = useMemo(() => islandGeometry(tiles, seed), [tiles, seed]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, transparent: ghost, opacity: ghost ? 0.55 : 1 }), [ghost]);
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

const NO_HOUSES: string[] = [];

/** Trees, rocks, hills and houses on the free tiles of an island, from its seed. */
export function Decor({ tiles, seed, houses = NO_HOUSES }: { tiles: Tile[]; seed: number; houses?: string[] }) {
  const layout = useMemo(() => {
    const rand = rng(seed);
    const groups: Record<string, Placed[]> = { trees: [], treesB: [], tree: [], rock: [], rockB: [], hills: [], mountain: [] };
    const singles: { name: string; p: Vec3; ry: number }[] = [];
    let house = 0;
    for (const tile of tiles) {
      const [x, , z] = hex(tile);
      const roll = rand();
      const ry = Math.floor(rand() * 6) * (Math.PI / 3);
      const outer = ring(tile) >= 2;
      if (roll < 0.16 && outer) groups[rand() < 0.5 ? "trees" : "treesB"]!.push({ p: [x, 0, z], ry });
      else if (roll < 0.28 && outer) groups[rand() < 0.6 ? "hills" : "mountain"]!.push({ p: [x, 0, z], ry });
      else if (roll < 0.4 && house < houses.length) singles.push({ name: houses[house++]!, p: [x, 0, z], ry });
      else {
        for (let k = 0, n = Math.floor(rand() * 3); k < n; k++) {
          const a = rand() * Math.PI * 2, d = 0.5 + rand() * 0.6;
          groups[rand() < 0.65 ? "tree" : rand() < 0.5 ? "rock" : "rockB"]!.push({ p: [x + Math.cos(a) * d * TILE, 0, z + Math.sin(a) * d * TILE], ry: rand() * 6, s: 0.8 + rand() * 0.5 });
        }
      }
    }
    return { groups, singles };
  }, [tiles, seed, houses]);
  return (
    <>
      {Object.entries(layout.groups).map(([name, items]) => <Instanced key={name} name={name} items={items} />)}
      {layout.singles.map((single, index) => <Piece key={index} name={single.name} position={single.p} ry={single.ry} />)}
    </>
  );
}

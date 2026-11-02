import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { isletGeometry, STILL } from "./ground";
import { rng } from "./kit";
import type { Vec3 } from "./layout";

// The sky around the islands, in three depths (after the paintover in
// docs/world-concept): a far bank of cumulus and a few islets in the haze that
// follow the camera at a fraction of its speed, mid clouds that sit among the
// islands, and near clouds at the frame's corners that sweep past when the
// camera flies. The gradient and the sun are CSS behind the canvas (stage.tsx);
// the fog has the sky's colour, so whatever is far fades into it.

export const FOG = { color: "#e3dbfb", near: 72, far: 150 };

/** Where the camera looks and how far it is zoomed, written by the camera rig each frame. */
export const cameraView = { target: new THREE.Vector3(), zoom: 15 };

// ---- cloud texture: four cumulus painted once in the browser ----------------------------

const CELL = 512;
const PAD = 16;

/**
 * One cumulus: overlapping puffs, each lit warm-white at its top right and
 * lavender in its belly, with a faint shadow where a puff sits on the one
 * behind it, on a flat base that fades into the haze.
 */
function paintCumulus(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, seed: number) {
  const rand = rng(seed);
  const base = y0 + h * 0.9;
  // big puffs along a cumulus profile, tallest a little off-centre, then
  // smaller cauliflower puffs on their shoulders; all inside the cell
  const peak = 0.38 + rand() * 0.24;
  const puffs: [number, number, number][] = [];
  const n = 6 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const t = 0.2 + (0.6 * (i + 0.3 + rand() * 0.4)) / n;
    const tall = Math.max(0, 1 - Math.abs(t - peak) * 2.1) ** 0.8;
    const r = Math.min(h * (0.17 + tall * 0.24) * (0.8 + rand() * 0.4), w * 0.17);
    puffs.push([x0 + w * t, base - h * 0.12 - r * (0.35 + tall * 0.55), r]);
  }
  for (let i = 0; i < 6; i++) {
    const [px, py, pr] = puffs[Math.floor(rand() * puffs.length)]!;
    const a = -Math.PI * (0.15 + rand() * 0.7);
    const r = pr * (0.35 + rand() * 0.25);
    const cy = Math.max(y0 + r, py + Math.sin(a) * pr * 0.8);
    puffs.push([px + Math.cos(a) * pr * 0.8, cy, r]);
  }
  puffs.sort((a, b) => b[2] - a[2]);
  ctx.filter = "blur(1px)";
  // the flat body the puffs sit on
  const body = ctx.createLinearGradient(0, base - h * 0.3, 0, base);
  body.addColorStop(0, "#ece5ff");
  body.addColorStop(1, "#c6b9f0");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x0 + w * 0.5, base - h * 0.12, w * 0.34, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [cx, cy, r] of puffs) {
    // the shadow it casts on what is behind it
    ctx.fillStyle = "rgba(150,132,214,0.2)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.1, cy + r * 0.12, r * 1.03, 0, Math.PI * 2);
    ctx.fill();
    // light top right, lavender belly
    const g = ctx.createLinearGradient(cx + r * 0.55, cy - r, cx - r * 0.35, cy + r);
    g.addColorStop(0, "#fffaf2");
    g.addColorStop(0.45, "#f6f1ff");
    g.addColorStop(0.8, "#d8cdf7");
    g.addColorStop(1, "#c2b5ee");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = "none";
  // the base melts into the haze
  ctx.globalCompositeOperation = "destination-out";
  const fade = ctx.createLinearGradient(0, base - h * 0.16, 0, base);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(x0, base - h * 0.16, w, y0 + h - (base - h * 0.16));
  ctx.globalCompositeOperation = "source-over";
}

function paintClouds() {
  const canvas = document.createElement("canvas");
  canvas.width = CELL * 2;
  canvas.height = CELL;
  const ctx = canvas.getContext("2d")!;
  for (let cell = 0; cell < 4; cell++) {
    const x0 = (cell % 2) * CELL, y0 = Math.floor(cell / 2) * (CELL / 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 + PAD / 2, y0 + PAD / 2, CELL - PAD, CELL / 2 - PAD);
    ctx.clip();
    paintCumulus(ctx, x0 + PAD, y0 + PAD, CELL - PAD * 2, CELL / 2 - PAD * 2, 17 + cell * 31);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

let cloudTexture: THREE.Texture | null = null;
const cloudAtlas = () => (cloudTexture ??= paintClouds());

// ---- billboard material: camera-facing quads, drifting, fading into the fog -------------

const fogColor = new THREE.Color(FOG.color);

function cloudMaterial(opacity: number, fog: boolean) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      map: { value: cloudAtlas() },
      time: { value: 0 },
      opacity: { value: opacity },
      fogColor: { value: fogColor },
      fogNear: { value: fog ? FOG.near : 1e5 },
      fogFar: { value: fog ? FOG.far : 2e5 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 cloud; // atlas cell, mirror (-1 or 1), drift phase
      uniform float time;
      varying vec2 vUv;
      varying float vFog;
      void main() {
        vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
        center.x += sin(time * 0.05 + cloud.z) * size.x * 0.06;
        vec4 view = center + vec4(position.xy * size, 0.0, 0.0);
        float cell = cloud.x;
        vec2 u = vec2(cloud.y > 0.0 ? uv.x : 1.0 - uv.x, uv.y);
        vUv = (u + vec2(mod(cell, 2.0), 1.0 - floor(cell / 2.0))) * vec2(0.5, 0.5);
        vFog = -view.z;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float opacity;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying vec2 vUv;
      varying float vFog;
      void main() {
        vec4 c = texture2D(map, vUv);
        float f = smoothstep(fogNear, fogFar, vFog);
        gl_FragColor = vec4(mix(c.rgb, fogColor, f * 0.85), c.a * opacity);
        #include <colorspace_fragment>
      }
    `,
  });
}

type Cloud = { p: Vec3; w: number; cell: number; flip: boolean };

function CloudLayer({ clouds, opacity, fog = true, order, layerRef }: { clouds: Cloud[]; opacity: number; fog?: boolean; order: number; layerRef?: React.RefObject<THREE.InstancedMesh | null> }) {
  const own = useRef<THREE.InstancedMesh>(null);
  const ref = layerRef ?? own;
  const material = useMemo(() => cloudMaterial(opacity, fog), [opacity, fog]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    g.setAttribute("cloud", new THREE.InstancedBufferAttribute(new Float32Array(clouds.flatMap((c, i) => [c.cell, c.flip ? -1 : 1, i * 1.7])), 3));
    return g;
  }, [clouds]);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const m = new THREE.Matrix4();
    clouds.forEach((c, i) => {
      m.compose(new THREE.Vector3(...c.p), new THREE.Quaternion(), new THREE.Vector3(c.w, c.w * 0.5, 1));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [clouds, ref]);
  useFrame(({ clock }) => {
    material.uniforms.time!.value = STILL ? 0 : clock.elapsedTime;
  });
  return <instancedMesh ref={ref} args={[geometry, material, clouds.length]} renderOrder={order} frustumCulled={false} />;
}

// ---- the layers ----------------------------------------------------------------------------

// Every camera shot looks from +x +y +z. Clouds are pushed away from it along
// this direction, so they always sit behind the islands, never over a building.
const ISO_DIR = new THREE.Vector3(40, 34, 40).normalize();
const SCREEN_RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const SCREEN_UP = new THREE.Vector3().crossVectors(ISO_DIR, SCREEN_RIGHT).normalize();
const behind = (p: Vec3, by: number): Vec3 => [p[0] - ISO_DIR.x * by, p[1] - ISO_DIR.y * by, p[2] - ISO_DIR.z * by];

/** Far: a wide bank below and behind everything, moving at 30% of the camera. */
function FarSky() {
  const group = useRef<THREE.Group>(null);
  const clouds = useMemo(() => {
    const rand = rng(5);
    const out: Cloud[] = [];
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2, d = 18 + rand() * 46;
      out.push({ p: behind([Math.cos(a) * d, -14 - rand() * 14, Math.sin(a) * d], 55), w: 22 + rand() * 18, cell: i % 4, flip: rand() < 0.5 });
    }
    return out;
  }, []);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    // Far things barely grow when the camera zooms in: scale the layer about
    // the view's centre, and let it follow the camera at 70% of its motion.
    const k = THREE.MathUtils.clamp(15 / cameraView.zoom, 0.25, 1);
    g.scale.setScalar(k);
    g.position.copy(cameraView.target).multiplyScalar(1 - 0.3 * k);
  });
  return (
    <group ref={group}>
      <CloudLayer clouds={clouds} opacity={0.9} order={-3} />
      <Islets />
    </group>
  );
}

/** Mid: cumulus that sit among the islands, below their rims and between them. */
export function MidClouds({ anchors }: { anchors: Vec3[] }) {
  const key = anchors.map((a) => a.join()).join("|");
  const clouds = useMemo(() => {
    const rand = rng(41);
    const out: Cloud[] = [];
    anchors.forEach(([x, y, z], k) => {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + rand() * 1.2 + k, d = 8 + rand() * 6;
        out.push({ p: behind([x + Math.cos(a) * d, y - 4 - rand() * 6, z + Math.sin(a) * d], 18), w: 7 + rand() * 6, cell: (i + k) % 4, flip: rand() < 0.5 });
      }
    });
    return out;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <CloudLayer clouds={clouds} opacity={0.95} order={-2} />;
}

/**
 * Near: two big soft clouds at the frame's corners, in front of everything. They
 * stay put on screen, sweep across when the camera flies, then settle back.
 */
function NearClouds() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { camera, size } = useThree();
  const last = useRef<THREE.Vector3 | null>(null);
  const sweep = useRef(new THREE.Vector2());
  const clouds = useMemo<Cloud[]>(() => [
    { p: [0, 0, 0], w: 1, cell: 2, flip: false },
    { p: [0, 0, 0], w: 1, cell: 1, flip: true },
  ], []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const zoom = (camera as THREE.OrthographicCamera).zoom;
    const halfW = size.width / 2 / zoom, halfH = size.height / 2 / zoom;
    camera.matrixWorld.extractBasis(right, up, fwd);
    const target = cameraView.target;
    // camera motion on screen pushes the near layer the other way, faster
    if (last.current && !STILL) {
      const moved = target.clone().sub(last.current);
      sweep.current.x -= (moved.dot(right) / halfW) * 1.6;
      sweep.current.y -= (moved.dot(up) / halfH) * 1.6;
    }
    last.current = target.clone();
    sweep.current.multiplyScalar(Math.exp(-delta * 1.4));
    const portrait = size.height > size.width * 1.3;
    const corners: [number, number, number][] = portrait
      ? [[-0.95, -1.02, 1.5], [1.0, 0.58, 1.3]]
      : [[-1.05, -1.05, 1.0], [1.05, 0.62, 0.8]];
    const m = new THREE.Matrix4();
    corners.forEach(([sx, sy, w], i) => {
      const width = halfW * 2 * w * (portrait ? 0.9 : 0.55);
      const p = target.clone()
        .addScaledVector(right, (sx + sweep.current.x) * halfW)
        .addScaledVector(up, (sy + sweep.current.y) * halfH - width * 0.25)
        .addScaledVector(fwd, 60);
      m.compose(p, new THREE.Quaternion(), new THREE.Vector3(width, width * 0.5, 1));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <CloudLayer clouds={clouds} opacity={0.78} fog={false} order={20} layerRef={ref} />;
}

// ---- islets in the haze ----------------------------------------------------------------------

// Screen-ish spots (right, up) pushed 45 units away from the camera, into the haze.
const ISLET_SPOTS: { p: Vec3; s: number }[] = ([
  { at: [-13, 9], s: 1.3 },
  { at: [11, 13], s: 0.9 },
  { at: [-20, -4], s: 0.7 },
  { at: [19, 2], s: 0.55 },
] as { at: [number, number]; s: number }[]).map(({ at, s }) => {
  const p = new THREE.Vector3().addScaledVector(SCREEN_RIGHT, at[0]).addScaledVector(SCREEN_UP, at[1]).addScaledVector(ISO_DIR, -45);
  return { p: [p.x, p.y, p.z] as Vec3, s };
});

/** A few small floating rocks far behind, for scale; the fog turns them to silhouettes. */
function Islets() {
  const geometry = useMemo(() => isletGeometry(77, 0.32), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    group.current?.children.forEach((child, i) => {
      child.position.y = ISLET_SPOTS[i]!.p[1] + (STILL ? 0 : Math.sin(clock.elapsedTime * 0.3 + i * 2) * 0.25);
    });
  });
  return (
    <group ref={group}>
      {ISLET_SPOTS.map((spot, i) => (
        <mesh key={i} geometry={geometry} material={material} position={spot.p} scale={spot.s * 1.7} rotation={[0, i * 1.9, 0]} />
      ))}
    </group>
  );
}

/** Fog in the sky's colour, and the far and near layers. */
export function Sky() {
  const scene = useThree((state) => state.scene);
  useLayoutEffect(() => {
    scene.fog = new THREE.Fog(FOG.color, FOG.near, FOG.far);
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  return (
    <>
      <FarSky />
      <NearClouds />
    </>
  );
}

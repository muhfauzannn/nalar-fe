import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useNavigation } from "react-router";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { announcePoints, awardChip, flyCoin, gameGsap, HAPTIC, haptic, playSound } from "~/features/game-feel";

import { cn } from "~/lib/utils";
import { SceneReady } from "~/features/loading/scene-ready";
import { prefetchStudentPage } from "../api/student";
import { useNow } from "../hooks/use-now";
import { pointCopy, postNames } from "../lib/game";
import type { IslandSketch, PostStatus } from "../types";
import { Classroom, preloadClassroom } from "./classroom";
import { classroomUrl } from "./classroom-focus";
import { urgentTags } from "./deadlines";
import { HexBoard, STILL } from "./ground";
import { Clickable, Sign, SignText } from "./signs";
import { Decor, Instanced, Piece, rng, seedOf, useKit, type Placed } from "./kit";
import { hex, islandLayout, ring, sketchOf, TILE, tilesWithin, worldLayout, type HallLayout, type IslandLayout, type Vec3, type WorldIsland } from "./layout";
import { cameraView, MidClouds, Sky } from "./sky";
import { fadeVeil } from "./veil";
import { frameWorld, type WorldExtent } from "./world-camera";
import { useWorldCarousel } from "./carousel";
import { useOpenJoinSheet } from "./join";
import { classroomForScene, sceneMatchesRoute, shotForUrl, useWorldScene, type ChestState, type WorldScene, type WorldShot } from "./store";

const C = { mint: "#4bd29f", lav: "#d3c5f8", stone: "#efeafc", rim: "#c9bff0" };
const ISO: Vec3 = [40, 34, 40];

// ---- camera -------------------------------------------------------------------------

type CameraShot = { target: Vec3; from: Vec3; zoom: number; phone?: { zoom: number; target?: Vec3 }; calm?: boolean };

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

function cameraFor(shot: WorldShot, islands: WorldIsland[], detail: IslandLayout | null, overview: WorldExtent[], size: { width: number; height: number }, mobile: boolean): CameraShot {
  const at = (courseId: string) => islands.find((island) => island.courseId === courseId)?.position ?? [0, 0, 0];
  if (shot.kind === "world") {
    if (mobile) {
      const frame = frameWorld(overview, size.width, size.height);
      if (frame) {
        const scale = Math.max(0.42, Math.min(size.width, size.height) / 800);
        return { target: frame.target, from: ISO, zoom: frame.zoom / scale, calm: true };
      }
    }
    return { target: [0, -1, 0], from: ISO, zoom: 15 };
  }
  const base = at(shot.courseId);
  const radius = detail ? Math.max(...detail.tiles.map(ring)) : 3;
  if (shot.kind === "island") {
    const fit = 3.5 / (radius + 0.5);
    return { target: add(base, [0.5, 0.5, -0.4]), from: ISO, zoom: 33 * fit, phone: { zoom: 40 * fit } };
  }
  if (shot.kind === "place") {
    const place = detail?.places.find((item) => item.place === shot.place);
    // The building sits in the upper half, above the card that lists its places.
    return { target: add(base, place ? hex(place.tile, -1.4) : [0, -1.4, 0]), from: [34, 22, 46], zoom: 58, phone: { zoom: 52 } };
  }
  if (shot.kind === "classroom") {
    // Diving at the library's door; the room takes over under the veil.
    const library = detail?.places.find((item) => item.place === "library");
    return { target: add(base, library ? hex(library.tile, 0.9) : [0, 0.9, 0]), from: [34, 22, 46], zoom: 150, phone: { zoom: 130 }, calm: true };
  }
  const hall = detail?.halls.find((item) => item.assignmentId === shot.assignmentId);
  return { target: add(base, hall ? hex(hall.center, 1) : [0, 1, 0]), from: [30, 40, 46], zoom: 50, phone: { zoom: 46 } };
}

function CameraRig({ shot }: { shot: CameraShot }) {
  const { camera: current, size } = useThree();
  // The world's own orthographic camera, even while the classroom's is the default.
  const [camera] = useState(() => current);
  const state = useRef({ tx: 0, ty: 0, tz: 0, px: 40, py: 34, pz: 40, zoom: 15 });
  const first = useRef(true);
  const flight = useRef<ReturnType<ReturnType<typeof gameGsap>["to"]> | null>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const key = JSON.stringify(shot);
  useEffect(() => {
    const scale = Math.min(size.width, size.height) / 800;
    // Portrait phones frame by width, so shots carry their own phone framing.
    const portrait = size.height > size.width * 1.3;
    const target = (portrait && shot.phone?.target) || shot.target;
    const zoom = (portrait && shot.phone?.zoom) || shot.zoom;
    const to = { tx: target[0], ty: target[1], tz: target[2], px: target[0] + shot.from[0], py: target[1] + shot.from[1], pz: target[2] + shot.from[2], zoom: zoom * Math.max(0.42, scale) };
    const g = gameGsap();
    const left = flight.current?.isActive() ? flight.current.duration() - flight.current.time() : 0;
    g.killTweensOf(state.current);
    if (first.current || reduced) {
      Object.assign(state.current, to);
      first.current = false;
      return;
    }
    // The route's data refined the shot mid-flight: land on it in the time left.
    if (left > 0.05) {
      flight.current = g.to(state.current, { ...to, duration: Math.max(0.45, left), ease: "power2.out" });
      return;
    }
    // Zooming out reads as taking off, zooming in as landing: one eased flight.
    playSound("whoosh");
    flight.current = g.to(state.current, { ...to, duration: 1.15, ease: "power2.inOut" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size.width, size.height]);
  useFrame(({ clock }) => {
    const s = state.current;
    const drift = shot.calm || reduced ? 0 : Math.sin(clock.elapsedTime * 0.25) * 0.15;
    cameraView.target.set(s.tx, s.ty, s.tz);
    cameraView.zoom = s.zoom;
    camera.position.set(s.px + drift, s.py, s.pz - drift);
    camera.lookAt(s.tx + drift, s.ty, s.tz - drift);
    (camera as THREE.OrthographicCamera).zoom = s.zoom;
    camera.updateProjectionMatrix();
  });
  return null;
}

/** Points a building's door (+z in KayKit) at a spot. */
function facing(from: Vec3, to: Vec3) {
  return Math.atan2(to[0] - from[0], to[2] - from[2]);
}

// ---- posts, crystals, chest -----------------------------------------------------------

type PadHandles = { ring: THREE.Mesh; crystal: THREE.Group; base: THREE.Group };

function usePadMaterials() {
  return useMemo(() => ({
    stone: new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.85, flatShading: true }),
    rim: new THREE.MeshStandardMaterial({ color: C.rim, roughness: 0.85, flatShading: true }),
    crystal: new THREE.MeshPhysicalMaterial({ color: "#8ff5cf", emissive: C.mint, emissiveIntensity: 0.55, roughness: 0.15, clearcoat: 1, flatShading: true }),
    shard: new THREE.MeshPhysicalMaterial({ color: "#b8f3dc", emissive: C.mint, emissiveIntensity: 0.35, roughness: 0.2, clearcoat: 1, flatShading: true }),
  }), []);
}

function Pad({ position, index, state, label, onTap, register }: { position: Vec3; index: number; state: PostStatus; label: string; onTap: () => void; register: (index: number, handles: PadHandles) => void }) {
  const base = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const crystal = useRef<THREE.Group>(null);
  const mats = usePadMaterials();
  const glowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: C.mint, emissive: C.mint, transparent: true, opacity: 0.9 }), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9 }), []);
  useEffect(() => register(index, { ring: ringRef.current!, crystal: crystal.current!, base: base.current! }), [index, register]);
  useEffect(() => {
    glowMat.color.set(state === "locked" ? C.lav : C.mint);
    glowMat.emissive.set(state === "locked" ? "#8b7fd6" : C.mint);
    glowMat.emissiveIntensity = state === "done" ? 1.1 : state === "current" ? 0.6 : 0.12;
    if (crystal.current) crystal.current.visible = state === "done";
  }, [state, glowMat]);
  useFrame(({ clock }) => {
    if (STILL) return;
    if (state === "current" && glow.current) glow.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.6) * 0.06);
    if (crystal.current?.visible) {
      crystal.current.rotation.y = clock.elapsedTime * 0.8 + index;
      crystal.current.children[0]!.position.y = Math.sin(clock.elapsedTime * 1.6 + index) * 0.06;
    }
  });
  return (
    <group position={position}>
      <Clickable onClick={onTap} label={label}>
        <group ref={base}>
          <mesh position={[0, 0.06, 0]} material={mats.rim} castShadow receiveShadow><cylinderGeometry args={[0.98, 1.04, 0.16, 8]} /></mesh>
          <mesh position={[0, 0.2, 0]} material={mats.stone} castShadow receiveShadow><cylinderGeometry args={[0.8, 0.86, 0.14, 8]} /></mesh>
          <mesh ref={glow} position={[0, 0.275, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]} material={glowMat}><circleGeometry args={[0.6, 8]} /></mesh>
          <mesh ref={ringRef} position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false} material={ringMat}><ringGeometry args={[0.8, 0.92, 32]} /></mesh>
        </group>
      </Clickable>
      <group ref={crystal} position={[0, 0.85, 0]} visible={state === "done"}>
        <group>
          <mesh material={mats.crystal} scale={[0.3, 0.55, 0.3]} castShadow><octahedronGeometry args={[1, 0]} /></mesh>
          <mesh position={[0.26, -0.18, 0.08]} rotation={[0, 0, -0.5]} material={mats.shard} scale={[0.14, 0.28, 0.14]}><octahedronGeometry args={[1, 0]} /></mesh>
          <mesh position={[-0.2, -0.22, -0.1]} rotation={[0.3, 0, 0.55]} material={mats.shard} scale={[0.11, 0.22, 0.11]}><octahedronGeometry args={[1, 0]} /></mesh>
        </group>
      </group>
    </group>
  );
}

/** The posts of halls not in focus: one draw call for all plinths, one for the crystals. */
function QuietPads({ pads }: { pads: { p: Vec3; done: boolean }[] }) {
  const plinths = useRef<THREE.InstancedMesh>(null);
  const crystals = useRef<THREE.InstancedMesh>(null);
  const mats = usePadMaterials();
  const done = pads.filter((pad) => pad.done);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    pads.forEach((pad, index) => {
      m.compose(new THREE.Vector3(pad.p[0], pad.p[1] + 0.12, pad.p[2]), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      plinths.current?.setMatrixAt(index, m);
    });
    done.forEach((pad, index) => {
      m.compose(new THREE.Vector3(pad.p[0], pad.p[1] + 0.85, pad.p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, index, 0)), new THREE.Vector3(0.3, 0.55, 0.3));
      crystals.current?.setMatrixAt(index, m);
    });
    if (plinths.current) plinths.current.instanceMatrix.needsUpdate = true;
    if (crystals.current) crystals.current.instanceMatrix.needsUpdate = true;
  }, [pads, done]);
  const plinth = useMemo(() => new THREE.CylinderGeometry(0.85, 0.95, 0.24, 8), []);
  const gem = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
  return (
    <>
      {pads.length > 0 && <instancedMesh key={`p${pads.length}`} ref={plinths} args={[plinth, mats.stone, pads.length]} castShadow receiveShadow />}
      {done.length > 0 && <instancedMesh key={`c${done.length}`} ref={crystals} args={[gem, mats.crystal, done.length]} castShadow />}
    </>
  );
}

type ChestHandles = { group: THREE.Group; lid: THREE.Object3D; light: THREE.PointLight };

function Chest({ position, toward, state, onTap }: { position: Vec3; toward: Vec3; state: ChestState; onTap: () => void }) {
  const kit = useKit();
  const object = useMemo(() => kit("chest").clone(true), [kit]);
  const lid = useMemo(() => object.getObjectByName("chest_lid")!, [object]);
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const opening = useRef(false);
  useEffect(() => {
    if (state === "open" && !opening.current) lid.rotation.x = -1.9;
    if (state === "locked") lid.rotation.x = 0;
  }, [state, lid]);
  useFrame(({ clock }) => {
    if (STILL || state !== "ready" || !group.current || opening.current) return;
    // A chest that is ready nudges every two seconds.
    const t = clock.elapsedTime % 2;
    group.current.rotation.z = t > 1.5 ? Math.sin((t - 1.5) * 25) * 0.06 : 0;
  });
  function open() {
    if (state !== "ready" || opening.current) return onTap();
    const handles: ChestHandles = { group: group.current!, lid, light: light.current! };
    opening.current = true;
    const g = gameGsap();
    // The lid lifts here; the reward itself is the chest moment that follows.
    handles.group.rotation.z = 0;
    g.timeline({ onComplete: () => { opening.current = false; onTap(); } })
      .add(() => haptic(HAPTIC.award))
      .to(handles.lid.rotation, { x: -1.9, duration: 0.45, ease: "back.out(2)" })
      .to(handles.light, { intensity: 18, duration: 0.3 }, "<")
      .to(handles.light, { intensity: 4, duration: 0.4 });
  }
  return (
    <group position={position} rotation={[0, facing(position, toward), 0]}>
      <Clickable onClick={open} label="Peti balai">
        <group ref={group} scale={state === "locked" ? 0.6 : 0.7}>
          <primitive object={object} />
          <pointLight ref={light} position={[0, 1.6, 0.3]} color={C.mint} intensity={state === "open" ? 4 : 0} distance={5} />
        </group>
      </Clickable>
    </group>
  );
}

// ---- the lit-post moment, in 3D ---------------------------------------------------------

function useScreenOf() {
  const { camera, gl } = useThree();
  return (point: Vec3) => {
    const v = new THREE.Vector3(...point).project(camera);
    const box = gl.domElement.getBoundingClientRect();
    return { x: box.left + ((v.x + 1) / 2) * box.width, y: box.top + ((1 - v.y) / 2) * box.height };
  };
}

/** Meso "pos menyala": dip, ring, the crystal drops in, award chips rise, coins fly to the header, the cat hops on. */
function LitPlayer({ lit, pads, padPositions, catRef, nextCat }: { lit: NonNullable<WorldScene["lit"]>; pads: React.RefObject<Record<number, PadHandles>>; padPositions: Vec3[]; catRef: React.RefObject<THREE.Group | null>; nextCat: Vec3 | null }) {
  const screenOf = useScreenOf();
  const played = useRef(false);
  const index = padIndexOf(lit.stage);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    const g = gameGsap();
    const gain = lit.awards.reduce((sum, award) => sum + award.points, 0);
    // Wait for the camera to land on the hall first.
    const timeline = g.timeline({ delay: 1.3, onComplete: lit.onDone });
    const handles = pads.current?.[index];
    const at = padPositions[index];
    if (!handles || !at) {
      timeline.add(() => { playSound("chord"); if (gain) announcePoints(gain); });
      return;
    }
    handles.crystal.visible = false;
    timeline
      .from(handles.base.scale, { x: 0.86, y: 0.86, z: 0.86, duration: 0.14, ease: "power2.in" })
      .addLabel("act")
      .add(() => { playSound("chord"); haptic(HAPTIC.award); handles.ring.visible = true; handles.crystal.visible = true; })
      .fromTo(handles.ring.scale, { x: 0.9, y: 0.9, z: 0.9 }, { x: 2.4, y: 2.4, z: 2.4, duration: 0.7, ease: "power2.out" })
      .fromTo(handles.ring.material as THREE.MeshBasicMaterial, { opacity: 0.9 }, { opacity: 0, duration: 0.7 }, "<")
      .fromTo(handles.crystal.position, { y: 2.6 }, { y: 0.85, duration: 0.6, ease: "bounce.out" }, "<0.05")
      .fromTo(handles.crystal.scale, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 1, z: 1, duration: 0.5, ease: "nalar.spring" }, "<")
      .add(() => { handles.ring.visible = false; });
    lit.awards.forEach((award, i) => {
      timeline.add(() => {
        const point = screenOf([at[0], at[1] + 1.4, at[2]]);
        g.timeline().add(awardChip({ x: point.x, y: point.y - i * 30 }, award.points, pointCopy[award.kind].title)).add(flyCoin(point), 0.2);
      }, `act+=${0.15 + i * 0.18}`);
    });
    if (gain) timeline.add(() => announcePoints(gain), "act+=0.95");
    if (catRef.current && nextCat) {
      timeline
        .add(() => playSound("whoosh"), "act+=1.1")
        .to(catRef.current.position, { x: nextCat[0], z: nextCat[2], duration: 0.55, ease: "power2.inOut" }, "act+=1.1")
        .to(catRef.current.position, { y: nextCat[1] + 0.9, duration: 0.27, yoyo: true, repeat: 1, ease: "power2.out" }, "<");
    } else {
      timeline.to({}, { duration: 0.6 });
    }
    return () => { timeline.progress(1); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

const STAGE_ORDER = ["1_independent_effort", "2_guided_questioning", "3_ai_evaluation", "4_revision_finalization", "5_reflection"] as const;
const padIndexOf = (stage: string) => Math.max(0, STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]));

// ---- islands ----------------------------------------------------------------------------

const HOUSES = ["homeA", "well", "homeB"];

function HallGroup({ hall, focused, scene, showSign, onGo }: { hall: HallLayout; focused: boolean; scene: WorldScene; showSign: boolean; onGo: () => void }) {
  const center = hex(hall.center);
  const posts = hall.posts ?? STAGE_ORDER.map((stage) => ({ stage, status: "locked" as PostStatus }));
  const lit = focused && scene.lit?.assignmentId === hall.assignmentId ? scene.lit : null;
  const litIndex = lit ? padIndexOf(lit.stage) : -1;
  const padPositions = hall.pads.map((tile) => hex(tile, 0.1));
  const pads = useRef<Record<number, PadHandles>>({});
  const catRef = useRef<THREE.Group>(null);
  const currentIndex = posts.findIndex((post) => post.status === "current");
  // While the lit moment waits, the cat still stands on the post just finished.
  const catIndex = lit ? litIndex : currentIndex;
  const chestState: ChestState = scene.chest?.assignmentId === hall.assignmentId ? scene.chest.state : hall.chestOpen ? "open" : "locked";
  const done = posts.filter((post) => post.status === "done").length;
  return (
    <group>
      <group position={center} rotation={[0, facing(center, [0, 0, 0]), 0]}>
        <Clickable onClick={onGo} label={`Balai ${hall.title}`}>
          <Piece name={focused ? "castle" : "towerA"} scale={TILE * (focused ? 1.05 : 1.2)} />
        </Clickable>
      </group>
      {focused ? (
        <>
          {posts.map((post, index) => (
            <Pad
              key={post.stage}
              position={padPositions[index]!}
              index={index}
              state={index === litIndex ? "current" : post.status}
              label={`Pos ${index + 1}: ${postNames[post.stage]}`}
              onTap={() => (scene.shot.kind !== "world" && scene.onSelectPost ? scene.onSelectPost(post.stage) : onGo())}
              register={(i, handles) => { pads.current[i] = handles; }}
            />
          ))}
          <Chest position={hex(hall.chest, 0.02)} toward={center} state={chestState} onTap={() => (scene.chest?.assignmentId === hall.assignmentId ? scene.chest.onOpen() : onGo())} />
          {/* DOM over the canvas shows even when the world is hidden: not in the classroom. */}
          {catIndex >= 0 && scene.shot.kind !== "classroom" && (
            <group ref={catRef} position={padPositions[catIndex]}>
              <Html center position={[0, 1.6, 0]} zIndexRange={[19, 0]} style={{ pointerEvents: "none" }}>
                <span className="block h-[54px] w-[46px] overflow-hidden rounded-full border-[3px] border-[#4bd29f] bg-white shadow-[0_8px_16px_rgba(24,21,58,.3)]">
                  <img src="/game/cat-avatar.webp" alt="Kamu di sini" className="size-full scale-[1.12] object-cover" />
                </span>
              </Html>
            </group>
          )}
          {lit && <LitPlayer lit={lit} pads={pads} padPositions={padPositions} catRef={catRef} nextCat={currentIndex >= 0 ? padPositions[currentIndex]! : null} />}
        </>
      ) : (
        <QuietPads pads={posts.map((post, index) => ({ p: padPositions[index]!, done: post.status === "done" }))} />
      )}
      <Sign position={[center[0], focused ? 6.4 : 4.6, center[2]]} show={showSign} minor={!focused} onClick={onGo} dark={focused} label={`Balai ${hall.title}, ${done} dari 5 pos menyala`}>
        <SignText small={`Balai · ${done}/5 pos`} strong={hall.title} />
      </Sign>
    </group>
  );
}

const PLACE_PIECE = { library: { name: "church", scale: TILE * 1.35, label: "Perpustakaan" }, lab: { name: "windmill", scale: TILE * 1.4, label: "Lab" }, arena: { name: "archery", scale: TILE * 1.1, label: "Arena latihan" } } as const;

function Windmill({ scale }: { scale: number }) {
  const kit = useKit();
  const object = useMemo(() => kit("windmill").clone(true), [kit]);
  const fan = useMemo(() => object.getObjectByName("fan"), [object]);
  useFrame((_, delta) => {
    if (fan && !STILL) fan.rotation.z -= delta * 0.9;
  });
  return (
    <group scale={scale}>
      <primitive object={object} />
    </group>
  );
}

// ---- cobblestone paths --------------------------------------------------------------------

/**
 * The island's paths, as in the concept art: from the square in front of the
 * library to every other place and to each hall's first post, around each hall's
 * posts, and out to the island's front edge. Gentle seeded bends.
 */
function pathCurves(layout: IslandLayout, seed: number) {
  const rand = rng(seed);
  const hub = new THREE.Vector3(0, 0, 1.7);
  const curves: THREE.CatmullRomCurve3[] = [];
  const bend = (from: THREE.Vector3, to: THREE.Vector3) => {
    const mid = from.clone().lerp(to, 0.5);
    const side = new THREE.Vector3(-(to.z - from.z), 0, to.x - from.x).normalize().multiplyScalar((rand() - 0.5) * 1.1);
    return new THREE.CatmullRomCurve3([from, mid.add(side), to]);
  };
  const toward = (point: THREE.Vector3, target: THREE.Vector3, by: number) => point.clone().add(target.clone().sub(point).setY(0).normalize().multiplyScalar(by));
  for (const place of layout.places) {
    if (place.place === "library") continue;
    const at = new THREE.Vector3(...hex(place.tile));
    curves.push(bend(hub, toward(at, hub, 1.25)));
  }
  for (const hall of layout.halls) {
    const pads = hall.pads.map((tile) => new THREE.Vector3(...hex(tile)));
    curves.push(bend(hub, toward(pads[0]!, hub, 0.95)));
    curves.push(new THREE.CatmullRomCurve3(pads));
  }
  const radius = Math.max(...layout.tiles.map(ring));
  const edge = new THREE.Vector3(0.45, 0, 1).normalize().multiplyScalar((radius + 0.6) * 2.25);
  curves.push(bend(hub, edge));
  return curves;
}

function CobblePaths({ curves, seed, near }: { curves: THREE.CatmullRomCurve3[]; seed: number; near: boolean }) {
  const { strip, placements } = useMemo(() => {
    const rand = rng(seed);
    const positions: number[] = [];
    const index: number[] = [];
    const placed: { p: THREE.Vector3; s: number; r: number }[] = [];
    const width = 0.46;
    for (const curve of curves) {
      const steps = Math.max(4, Math.round(curve.getLength() / 0.22));
      const base = positions.length / 3;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const p = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width);
        positions.push(p.x + side.x, 0.012, p.z + side.z, p.x - side.x, 0.012, p.z - side.z);
        if (i < steps) {
          const a = base + i * 2;
          index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
        // cobbles: one or two per step, scattered across the path
        for (let k = 0, n = 1 + Math.floor(rand() * 2); k < n; k++) {
          const across = (rand() - 0.5) * 1.7;
          placed.push({ p: p.clone().add(side.clone().multiplyScalar(across)), s: 0.75 + rand() * 0.5, r: rand() * Math.PI });
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    return { strip: geometry, placements: placed };
  }, [curves, seed]);
  const groundMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c7bcdc", roughness: 0.95 }), []);
  return (
    <>
      <mesh geometry={strip} material={groundMat} receiveShadow />
      <Grow show={near}>
        <CobbleStones placements={placements} seed={seed} />
      </Grow>
    </>
  );
}

/** The path's stones; mounted only up close, so they place themselves when they mount. */
function CobbleStones({ placements, seed }: { placements: { p: THREE.Vector3; s: number; r: number }[]; seed: number }) {
  const stones = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = stones.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const tint = new THREE.Color();
    const rand = rng(seed + 7);
    placements.forEach((stone, i) => {
      m.compose(new THREE.Vector3(stone.p.x, 0.03, stone.p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, stone.r, 0)), new THREE.Vector3(stone.s, 1, stone.s));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, tint.set(rand() < 0.5 ? "#e9e3f4" : "#d4cce6"));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placements, seed]);
  // A six-sided stone with no underside: 18 triangles, read from above only.
  const cobble = useMemo(() => {
    const side = new THREE.CylinderGeometry(0.12, 0.14, 0.05, 6, 1, true);
    const top = new THREE.CircleGeometry(0.12, 6).rotateX(-Math.PI / 2).translate(0, 0.025, 0);
    return mergeGeometries([side.toNonIndexed(), top.toNonIndexed()])!;
  }, []);
  const stoneMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9 }), []);
  return <instancedMesh key={placements.length} ref={stones} args={[cobble, stoneMat, placements.length]} receiveShadow />;
}

/**
 * Detail that only matters up close grows out of the ground when the camera
 * heads for the island, and sinks back when it leaves: the island itself (its
 * shape, buildings, posts and signs) never changes with distance.
 */
function Grow({ show, children }: { show: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const [mounted, setMounted] = useState(show);
  if (show && !mounted) setMounted(true);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const target = show ? 1 : 0;
    const y = STILL ? target : THREE.MathUtils.damp(g.scale.y, target, 5, delta);
    g.scale.set(1, Math.max(y, 0.001), 1);
    g.visible = y > 0.01;
  });
  if (!mounted) return null;
  return <group ref={ref} scale={[1, show && STILL ? 1 : 0.001, 1]}>{children}</group>;
}

function DetailIsland({ layout, position, scene, near }: { layout: IslandLayout; position: Vec3; scene: WorldScene; near: boolean }) {
  const navigate = useNavigate();
  const shot = scene.shot;
  // Anywhere on the island leads to the class, so the whole island is one
  // button, except inside a hall or the room itself, where posts and the chest
  // keep their own taps.
  const wholeIsland = shot.kind === "world" || shot.kind === "island" || shot.kind === "place";
  useEffect(() => {
    if (wholeIsland) return () => { document.body.style.cursor = ""; };
  }, [wholeIsland]);
  const seed = seedOf(layout.courseId);
  const onIsland = shot.kind === "island" && shot.courseId === layout.courseId;
  const focusHall = shot.kind === "hall" && shot.courseId === layout.courseId ? shot.assignmentId : layout.nextHall;
  // Every building, post, sign and the island itself opens the class.
  const go = () => navigate(classroomUrl(layout.courseId));
  const curves = useMemo(() => pathCurves(layout, seed), [layout, seed]);
  // Nothing grows on the paths.
  const free = useMemo(() => {
    const samples = curves.flatMap((curve) => curve.getSpacedPoints(Math.max(4, Math.round(curve.getLength() / 0.6))));
    return layout.free.filter((tile) => {
      const [x, , z] = hex(tile);
      return samples.every((p) => Math.hypot(p.x - x, p.z - z) > 1.25);
    });
  }, [curves, layout.free]);
  return (
    <group
      position={position}
      onClick={wholeIsland ? (event) => { event.stopPropagation(); go(); } : undefined}
      onPointerOver={wholeIsland ? (event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={wholeIsland ? () => { document.body.style.cursor = ""; } : undefined}
    >
      <HexBoard tiles={layout.tiles} seed={seed} dressing={near ? "full" : "light"} />
      <CobblePaths curves={curves} seed={seed} near={near} />
      <Decor tiles={free} seed={seed + 1} houses={HOUSES} share="far" />
      <Grow show={near}>
        <Decor tiles={free} seed={seed + 1} houses={HOUSES} share="rest" />
      </Grow>
      {layout.places.map((place) => {
        const at = hex(place.tile);
        const piece = PLACE_PIECE[place.place];
        const { done, total } = place;
        return (
          <group key={place.place}>
            <group position={at} rotation={[0, place.tile[0] === 0 && place.tile[1] === 0 ? 0 : facing(at, [0, 0, 0]), 0]}>
              <Clickable onClick={go} label={piece.label}>
                {place.place === "lab" ? <Windmill scale={piece.scale} /> : <Piece name={piece.name} scale={piece.scale} />}
              </Clickable>
            </group>
            <Sign position={[at[0], place.place === "library" ? 4 : 3.6, at[2]]} show={onIsland} minor onClick={go} label={`${piece.label}, ${done} dari ${total} selesai`}>
              <SignText small={piece.label} strong={`${done}/${total} selesai`} />
            </Sign>
          </group>
        );
      })}
      {layout.halls.map((hall) => (
        <HallGroup
          key={hall.assignmentId}
          hall={hall}
          focused={hall.assignmentId === focusHall}
          scene={scene}
          showSign={onIsland || (shot.kind === "hall" && shot.assignmentId === hall.assignmentId)}
          onGo={go}
        />
      ))}
    </group>
  );
}

const SMALL_TILES = tilesWithin(2, [[2, -2], [-2, 1]]);
const SMALL_FREE = SMALL_TILES.filter((tile) => tile[0] !== 0 || tile[1] !== 0);
const LANDMARKS = ["watermill", "market", "church", "windmill", "castle"];

function SimpleIsland({ island, index, showSign, active, tag }: { island: WorldIsland; index: number; showSign: boolean; active: boolean; tag?: string }) {
  const navigate = useNavigate();
  const seed = seedOf(island.courseId);
  const go = () => navigate(classroomUrl(island.courseId));
  return (
    <group position={island.position}>
      <Clickable onClick={go} label={`Kelas ${island.subject}`}>
        <HexBoard tiles={SMALL_TILES} seed={seed} dressing="light" />
        <Decor tiles={SMALL_FREE} seed={seed + 1} houses={HOUSES.slice(0, 1)} />
        <Piece name={LANDMARKS[index % LANDMARKS.length]!} ry={0.6} scale={TILE * 1.25} />
      </Clickable>
      <WorldSign island={island} show={showSign} active={active} onClick={go} height={6} tag={tag} />
    </group>
  );
}

function WorldSign({ island, show, active, onClick, height, tag }: { island: WorldIsland; show: boolean; active: boolean; onClick: () => void; height: number; tag?: string }) {
  return (
    // A tag makes the sign taller; it rises with it so it does not sit on the island's marker.
    <Sign position={[0, height + (tag ? 0.7 : 0), 0]} show={show} onClick={onClick} dark={active} label={`Kelas ${island.subject}, ${island.hallsDone} dari ${island.halls} balai tuntas${tag ? `, ${tag}` : ""}`}>
      <SignText small={active ? "Sedang dijelajahi" : island.halls ? `${island.hallsDone}/${island.halls} balai tuntas` : island.name} strong={`Kelas ${island.subject}`} tag={tag} />
    </Sign>
  );
}

function JoinIsland({ position, show }: { position: Vec3; show: boolean }) {
  // Joining is a sheet over the world, so the camera stays where it is.
  const openJoin = useOpenJoinSheet();
  const mist = useMemo(() => new THREE.MeshStandardMaterial({ color: C.lav, transparent: true, opacity: 0.55, depthWrite: false }), []);
  return (
    <group position={position}>
      <Clickable onClick={() => openJoin()} label="Gabung course">
        <HexBoard tiles={tilesWithin(1)} seed={31} ghost />
        <Piece name="towerA" />
        <mesh position={[0, 0.8, 0]} material={mist}><sphereGeometry args={[4.2, 16, 10]} /></mesh>
      </Clickable>
      <Sign position={[0, 6.5, 0]} show={show} onClick={() => openJoin()} label="Gabung course baru">
        <SignText small="Kelas berikutnya" strong="Gabung course" />
      </Sign>
    </group>
  );
}

// ---- sky ----------------------------------------------------------------------------------

function Bridge({ from, to }: { from: Vec3; to: Vec3 }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 18;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    // Leave the islands' edges free: stones only over the gap.
    for (let i = 0; i < count; i++) {
      const t = 0.18 + (i / (count - 1)) * 0.64;
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      p.y += Math.sin(t * Math.PI) * -1.4 - 0.6;
      m.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, i, 0)), new THREE.Vector3(1, 1, 1));
      ref.current!.setMatrixAt(i, m);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [from, to]);
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.3, 0.34, 0.12, 6), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9f5e2", emissive: C.mint, emissiveIntensity: 0.3, flatShading: true }), []);
  return <instancedMesh ref={ref} args={[geometry, material, count]} />;
}

/** Shadows are drawn once per change of the world, not every frame. */
function StaticShadows({ version }: { version: string }) {
  const gl = useThree((t) => t.gl);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    // Again once a crystal drop or a lid has settled.
    const id = window.setTimeout(() => { gl.shadowMap.needsUpdate = true; }, 3200);
    return () => window.clearTimeout(id);
  }, [gl, version]);
  return null;
}

// ---- the whole world ----------------------------------------------------------------------

// One layout object per distinct sketch: the island from Dunia and the island
// from its loaded course are the same object when their sketches agree.
const layoutCache = new Map<string, IslandLayout>();
function layoutOf(course: { id: string; name: string; subjectName: string }, sketch: IslandSketch) {
  const key = JSON.stringify([course, sketch]);
  let layout = layoutCache.get(key);
  if (!layout) {
    if (layoutCache.size > 40) layoutCache.clear();
    layout = islandLayout(course, sketch);
    layoutCache.set(key, layout);
  }
  return layout;
}

export function WorldScene3D() {
  const scene = useWorldScene();
  const location = useLocation();
  const expected = shotForUrl(location.pathname, location.search);
  const stagedForRoute = sceneMatchesRoute(scene.shot, expected);
  const navigate = useNavigate();
  // Only the camera anticipates navigation. Scene contents keep the committed
  // route's data until the destination loader stages its complete snapshot.
  const pending = useNavigation().location;
  const next = pending ? shotForUrl(pending.pathname, pending.search) : null;
  const shot = next ?? scene.shot;
  // The open course's own data is the freshest sketch of its island; the others
  // come with Dunia. Equal sketches give the very same layout object (layoutOf),
  // so nothing is rebuilt when the course's data arrives.
  const detail = scene.detail;
  const detailSketch = useMemo(() => (detail ? sketchOf(detail.course, detail.island) : null), [detail]);
  const focus = detail ? { courseId: detail.course.course.id, name: detail.course.course.name, subject: detail.course.course.subjectName } : null;
  const { islands, join } = useMemo(() => worldLayout(scene.world, focus), [scene.world, focus?.courseId]); // eslint-disable-line react-hooks/exhaustive-deps
  const layouts = islands.map((island) => {
    const sketch = island.courseId === focus?.courseId ? detailSketch : island.sketch;
    return sketch ? layoutOf({ id: island.courseId, name: island.name, subjectName: island.subject }, sketch) : null;
  });
  // Dev only: Dunia's sketch must match the one from the loaded course, or the
  // island changes on landing (nalar-be world.service.ts mirrors districtsOf).
  const worldSketch = islands.find((island) => island.courseId === focus?.courseId)?.sketch;
  useEffect(() => {
    if (import.meta.env.DEV && worldSketch && detailSketch && JSON.stringify(worldSketch) !== JSON.stringify(detailSketch)) {
      console.warn("[world3d] Dunia's island sketch differs from the course's", { world: worldSketch, course: detailSketch });
    }
  }, [worldSketch, detailSketch]);
  const shotCourse = shot.kind === "world" ? null : shot.courseId;
  const shotLayout = layouts[islands.findIndex((island) => island.courseId === shotCourse)] ?? null;
  const size = useThree((state) => state.size);
  const coarsePointer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const mobile = (typeof window !== "undefined" ? window.innerWidth < 768 : size.width < 768) || coarsePointer;
  const overview: WorldExtent[] = islands.map((island, index) => {
    const layout = layouts[index];
    const radius = layout ? Math.max(10, ...layout.tiles.map((tile) => {
      const [x, , z] = hex(tile);
      return Math.hypot(x, z) + 4;
    })) : 10;
    return { position: island.position, radius };
  });
  const carouselCount = scene.world ? scene.world.islands.length + 1 : 0;
  const carousel = useWorldCarousel(carouselCount);
  const selectedCourseId = scene.world?.islands[carousel]?.course.id;
  const selectedExtent = selectedCourseId ? overview[islands.findIndex((item) => item.courseId === selectedCourseId)] : scene.world ? { position: join, radius: 10 } : undefined;
  const camera = cameraFor(shot, islands, shotLayout, selectedExtent ? [selectedExtent] : [], size, mobile);
  const atWorld = shot.kind === "world";
  const activeId = scene.world?.islands.find((island) => island.current?.post)?.course.id ?? scene.world?.islands.find((island) => island.current)?.course.id ?? null;
  // Work due soon shows on its island's sign, the same amber as the HUD's Tenggat.
  const now = useNow();
  const deadlineTags = useMemo(() => urgentTags(scene.world?.upcoming ?? [], now), [scene.world?.upcoming, now]);
  const narrow = useThree((t) => t.size.width < 600);
  const center = islands[0]?.position ?? [0, 0, 0];
  // Dunia already draws every island; the course data only fills the cards on
  // landing. Warm it when the browser is idle, so landing waits for nothing.
  const worldIds = scene.world?.islands.map((island) => island.course.id).join() ?? "";
  useEffect(() => {
    if (!atWorld || !worldIds) return;
    const warm = () => worldIds.split(",").forEach((courseId) => prefetchStudentPage(`/courses/${courseId}`));
    // Safari has no requestIdleCallback: a short timeout instead.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 600);
    return () => clearTimeout(id);
  }, [atWorld, worldIds]);
  const shadowVersion = `${shot.kind}-${shotCourse}-${shotLayout?.halls.map((h) => h.posts?.map((p) => p.status).join()).join()}-${scene.chest?.state}`;

  // The classroom swaps in under the veil once the dive at the door is under way,
  // and the world swaps back the same way. The world stays mounted meanwhile.
  const classroom = useMemo(() => classroomForScene(scene), [scene]);
  // Keep the last complete room while the exit veil closes. Neither a pending
  // destination nor another course's data may replace its contents mid-exit.
  const [lastClassroom, setLastClassroom] = useState(classroom);
  useEffect(() => {
    if (classroom) setLastClassroom(classroom);
  }, [classroom]);
  const roomData = classroom ?? lastClassroom;
  const wantRoom = classroom !== null;
  const [room, setRoom] = useState(wantRoom);
  useEffect(() => {
    if (wantRoom === room) return;
    let live = true;
    void (async () => {
      if (wantRoom && !STILL) await new Promise((resolve) => setTimeout(resolve, 520));
      if (!live) return;
      await fadeVeil(1, STILL ? 0 : 200);
      if (!live) return;
      setRoom(wantRoom);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await fadeVeil(0, STILL ? 0 : 420);
    })();
    return () => {
      live = false;
    };
  }, [wantRoom, room]);
  // The classroom's model is fetched while the student is in the world or on an island, before it is needed.
  useEffect(() => {
    if (shot.kind === "world" || shot.kind === "island" || shot.kind === "place") preloadClassroom();
  }, [shot.kind]);
  return (
    <>
      {room && roomData && (
        <Suspense fallback={null}>
          <Classroom
            key={roomData.courseId}
            {...roomData}
            ready={stagedForRoute && wantRoom}
          />
        </Suspense>
      )}
      {!room && stagedForRoute && <SceneReady />}
      <group visible={!room}>
      <CameraRig shot={camera} />
      <hemisphereLight args={["#fbf7ff", "#7f75c9", 1.15]} />
      <directionalLight
        castShadow
        position={add(islands.find((i) => i.courseId === shotCourse)?.position ?? center, [16, 26, 12])}
        intensity={2.4}
        color="#fff4e3"
        shadow-mapSize={narrow ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      >
        <object3D attach="target" position={islands.find((i) => i.courseId === shotCourse)?.position ?? center} />
      </directionalLight>
      <ambientLight intensity={0.3} />
      <StaticShadows version={shadowVersion} />
      <Sky />
      <MidClouds anchors={islands.map((island) => island.position)} />

      {islands.map((island, index) => {
        const layout = layouts[index];
        // An older API sends no sketch: a stand-in until the course loads.
        if (!layout) return <SimpleIsland key={island.courseId} island={island} index={index} showSign={atWorld && (!mobile || island.courseId === selectedCourseId)} active={island.courseId === activeId} tag={deadlineTags.get(island.courseId)} />;
        return (
          <group key={island.courseId}>
            <DetailIsland layout={layout} position={island.position} scene={scene} near={island.courseId === shotCourse} />
            {/* The island places itself; its sign needs the same position or it floats over the centre. */}
            <group position={island.position}>
              <WorldSign island={island} show={atWorld && (!mobile || island.courseId === selectedCourseId)} active={island.courseId === activeId} onClick={() => navigate(classroomUrl(island.courseId))} height={8} tag={deadlineTags.get(island.courseId)} />
            </group>
          </group>
        );
      })}
      {scene.world && <JoinIsland position={join} show={atWorld && (!mobile || carousel === scene.world.islands.length)} />}
      {islands.slice(1).map((island) => <Bridge key={island.courseId} from={center} to={island.position} />)}
      </group>
    </>
  );
}

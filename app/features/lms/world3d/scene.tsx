import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router";
import * as THREE from "three";

import { announcePoints, awardChip, flyCoin, gameGsap, HAPTIC, haptic, playSound } from "~/features/game-feel";

import { cn } from "~/lib/utils";
import { pointCopy, postNames } from "../lib/game";
import type { PostStatus } from "../types";
import { Decor, HexBoard, Instanced, Piece, rng, seedOf, useKit, type Placed } from "./kit";
import { hex, islandLayout, ring, TILE, tilesWithin, worldLayout, type HallLayout, type IslandLayout, type Vec3, type WorldIsland } from "./layout";
import { useWorldScene, type ChestState, type WorldScene, type WorldShot } from "./store";

const C = { mint: "#4bd29f", lav: "#d3c5f8", stone: "#efeafc", rim: "#c9bff0" };
const ISO: Vec3 = [40, 34, 40];

// ---- camera -------------------------------------------------------------------------

type CameraShot = { target: Vec3; from: Vec3; zoom: number; phone?: { zoom: number; target?: Vec3 }; calm?: boolean };

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

function cameraFor(shot: WorldShot, islands: WorldIsland[], detail: IslandLayout | null): CameraShot {
  const at = (courseId: string) => islands.find((island) => island.courseId === courseId)?.position ?? [0, 0, 0];
  if (shot.kind === "world") {
    const first = islands[0]?.position ?? [0, 0, 0];
    return { target: [0, -1, 0], from: ISO, zoom: 15, phone: { zoom: 20, target: add(first, [-1, -1, -2]) } };
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
  const hall = detail?.halls.find((item) => item.assignmentId === shot.assignmentId);
  return { target: add(base, hall ? hex(hall.center, 1) : [0, 1, 0]), from: [30, 40, 46], zoom: 50, phone: { zoom: 46 } };
}

function CameraRig({ shot }: { shot: CameraShot }) {
  const { camera, size } = useThree();
  const state = useRef({ tx: 0, ty: 0, tz: 0, px: 40, py: 34, pz: 40, zoom: 15 });
  const first = useRef(true);
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
    g.killTweensOf(state.current);
    if (first.current || reduced) {
      Object.assign(state.current, to);
      first.current = false;
      return;
    }
    // Zooming out reads as taking off, zooming in as landing: one eased flight.
    playSound("whoosh");
    g.to(state.current, { ...to, duration: 1.15, ease: "power2.inOut" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size.width, size.height]);
  useFrame(({ clock }) => {
    const s = state.current;
    const drift = shot.calm || reduced ? 0 : Math.sin(clock.elapsedTime * 0.25) * 0.15;
    camera.position.set(s.px + drift, s.py, s.pz - drift);
    camera.lookAt(s.tx + drift, s.ty, s.tz - drift);
    (camera as THREE.OrthographicCamera).zoom = s.zoom;
    camera.updateProjectionMatrix();
  });
  return null;
}

// ---- signs and clicks -------------------------------------------------------------------

function Sign({ position, children, show: wanted, onClick, dark = false, minor = false, label }: { position: Vec3; children: ReactNode; show: boolean; onClick?: () => void; dark?: boolean; minor?: boolean; label: string }) {
  // On a narrow screen the minor signs would pile up; the dock names those places.
  const narrow = useThree((t) => t.size.width < 600);
  const show = wanted && !(minor && narrow);
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: show ? "auto" : "none" }}>
      <button
        type="button"
        onClick={onClick}
        tabIndex={show ? 0 : -1}
        aria-hidden={!show}
        aria-label={label}
        className={cn(
          "whitespace-nowrap rounded-[14px] px-3 py-1.5 text-left shadow-[0_6px_16px_rgba(24,21,58,.2)] transition-[opacity,transform] duration-300 active:scale-[0.96] max-sm:px-2.5 max-sm:py-1",
          dark ? "bg-[#18153a] text-white" : "bg-white/95 text-[#18153a]",
          !show && "pointer-events-none translate-y-1.5 scale-[0.96] opacity-0",
        )}
      >
        {children}
      </button>
    </Html>
  );
}

function SignText({ small, strong }: { small: string; strong: string }) {
  return (
    <>
      <small className="block text-[10.5px] opacity-70">{small}</small>
      <strong className="block max-w-[14rem] truncate text-[13.5px] max-sm:text-[12.5px]">{strong}</strong>
    </>
  );
}

function Clickable({ onClick, children, label }: { onClick: () => void; children: ReactNode; label: string }) {
  const ref = useRef<THREE.Group>(null);
  return (
    <group
      ref={ref}
      name={label}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        playSound("click");
        onClick();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
        gameGsap().to(ref.current!.scale, { x: 1.04, y: 1.04, z: 1.04, duration: 0.18, ease: "power2.out" });
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
        gameGsap().to(ref.current!.scale, { x: 1, y: 1, z: 1, duration: 0.2, ease: "power2.out" });
      }}
    >
      {children}
    </group>
  );
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
    if (state !== "ready" || !group.current || opening.current) return;
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

function HallGroup({ hall, focused, scene, showSign, onGo }: { hall: HallLayout; focused: boolean; scene: WorldScene; showSign: boolean; onGo: (href: string) => void }) {
  const navigate = useNavigate();
  const center = hex(hall.center);
  const posts = hall.building?.posts ?? STAGE_ORDER.map((stage) => ({ stage, status: "locked" as PostStatus, points: 0, earned: [] }));
  const lit = focused && scene.lit?.assignmentId === hall.assignmentId ? scene.lit : null;
  const litIndex = lit ? padIndexOf(lit.stage) : -1;
  const padPositions = hall.pads.map((tile) => hex(tile, 0.1));
  const pads = useRef<Record<number, PadHandles>>({});
  const catRef = useRef<THREE.Group>(null);
  const currentIndex = posts.findIndex((post) => post.status === "current");
  // While the lit moment waits, the cat still stands on the post just finished.
  const catIndex = lit ? litIndex : currentIndex;
  const chestState: ChestState = scene.chest?.assignmentId === hall.assignmentId ? scene.chest.state : hall.building?.chestOpen ? "open" : "locked";
  const done = posts.filter((post) => post.status === "done").length;
  return (
    <group>
      <group position={center} rotation={[0, facing(center, [0, 0, 0]), 0]}>
        <Clickable onClick={() => onGo(hall.href)} label={`Balai ${hall.title}`}>
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
              onTap={() => (scene.onSelectPost ? scene.onSelectPost(post.stage) : navigate(hall.href))}
              register={(i, handles) => { pads.current[i] = handles; }}
            />
          ))}
          <Chest position={hex(hall.chest, 0.02)} toward={center} state={chestState} onTap={() => (scene.chest?.assignmentId === hall.assignmentId ? scene.chest.onOpen() : onGo(hall.href))} />
          {catIndex >= 0 && (
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
      <Sign position={[center[0], focused ? 6.4 : 4.6, center[2]]} show={showSign} minor={!focused} onClick={() => onGo(hall.href)} dark={focused} label={`Balai ${hall.title}, ${done} dari 5 pos menyala`}>
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
    if (fan) fan.rotation.z -= delta * 0.9;
  });
  return (
    <group scale={scale}>
      <primitive object={object} />
    </group>
  );
}

function DetailIsland({ layout, position, scene }: { layout: IslandLayout; position: Vec3; scene: WorldScene }) {
  const navigate = useNavigate();
  const shot = scene.shot;
  const seed = seedOf(layout.courseId);
  const onIsland = shot.kind === "island" && shot.courseId === layout.courseId;
  const focusHall = shot.kind === "hall" && shot.courseId === layout.courseId ? shot.assignmentId : layout.nextHall;
  const go = (href: string) => navigate(href);
  return (
    <group position={position}>
      <HexBoard tiles={layout.tiles} seed={seed} />
      <Decor tiles={layout.free} seed={seed + 1} houses={HOUSES} />
      {layout.places.map((place) => {
        const at = hex(place.tile);
        const piece = PLACE_PIECE[place.place];
        const href = `/courses/${layout.courseId}?tempat=${place.place}`;
        const done = place.stops.filter((stop) => stop.done).length;
        return (
          <group key={place.place}>
            <group position={at} rotation={[0, place.tile[0] === 0 && place.tile[1] === 0 ? 0 : facing(at, [0, 0, 0]), 0]}>
              <Clickable onClick={() => go(href)} label={piece.label}>
                {place.place === "lab" ? <Windmill scale={piece.scale} /> : <Piece name={piece.name} scale={piece.scale} />}
              </Clickable>
            </group>
            <Sign position={[at[0], place.place === "library" ? 4 : 3.6, at[2]]} show={onIsland} minor onClick={() => go(href)} label={`${piece.label}, ${done} dari ${place.stops.length} selesai`}>
              <SignText small={piece.label} strong={`${done}/${place.stops.length} selesai`} />
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

function SimpleIsland({ island, index, showSign, active }: { island: WorldIsland; index: number; showSign: boolean; active: boolean }) {
  const navigate = useNavigate();
  const seed = seedOf(island.courseId);
  const go = () => navigate(`/courses/${island.courseId}`);
  return (
    <group position={island.position}>
      <Clickable onClick={go} label={`Pulau ${island.subject}`}>
        <HexBoard tiles={SMALL_TILES} seed={seed} />
        <Decor tiles={SMALL_FREE} seed={seed + 1} houses={HOUSES.slice(0, 1)} />
        <Piece name={LANDMARKS[index % LANDMARKS.length]!} ry={0.6} scale={TILE * 1.25} />
      </Clickable>
      <WorldSign island={island} show={showSign} active={active} onClick={go} height={6} />
    </group>
  );
}

function WorldSign({ island, show, active, onClick, height }: { island: WorldIsland; show: boolean; active: boolean; onClick: () => void; height: number }) {
  return (
    <Sign position={[0, height, 0]} show={show} onClick={onClick} dark={active} label={`Pulau ${island.subject}, ${island.hallsDone} dari ${island.halls} balai tuntas`}>
      <SignText small={active ? "Sedang dijelajahi" : island.halls ? `${island.hallsDone}/${island.halls} balai tuntas` : island.name} strong={`Pulau ${island.subject}`} />
    </Sign>
  );
}

function JoinIsland({ position, show }: { position: Vec3; show: boolean }) {
  const navigate = useNavigate();
  const mist = useMemo(() => new THREE.MeshStandardMaterial({ color: C.lav, transparent: true, opacity: 0.55, depthWrite: false }), []);
  return (
    <group position={position}>
      <Clickable onClick={() => navigate("/courses/join")} label="Gabung course">
        <HexBoard tiles={tilesWithin(1)} seed={31} ghost />
        <Piece name="towerA" />
        <mesh position={[0, 0.8, 0]} material={mist}><sphereGeometry args={[4.2, 16, 10]} /></mesh>
      </Clickable>
      <Sign position={[0, 6.5, 0]} show={show} onClick={() => navigate("/courses/join")} label="Gabung course baru">
        <SignText small="Pulau berikutnya" strong="Gabung course" />
      </Sign>
    </group>
  );
}

// ---- sky ----------------------------------------------------------------------------------

function Clouds() {
  const items = useMemo(() => {
    const rand = rng(99);
    const big: Placed[] = [], small: Placed[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + rand() * 0.5, d = 22 + rand() * 26;
      (i % 3 ? small : big).push({ p: [Math.cos(a) * d, -15 - rand() * 6, Math.sin(a) * d], ry: rand() * 6, s: 0.9 + rand() * 0.6 });
    }
    return { big, small };
  }, []);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.x = Math.sin(clock.elapsedTime * 0.05) * 2;
  });
  return (
    <group ref={ref}>
      <Instanced name="cloud" items={items.big} scale={1.6} />
      <Instanced name="cloudS" items={items.small} scale={1.6} />
    </group>
  );
}

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

export function WorldScene3D() {
  const scene = useWorldScene();
  const navigate = useNavigate();
  const { shot } = scene;
  const detailLayout = useMemo(() => (scene.detail ? islandLayout(scene.detail.course, scene.detail.island) : null), [scene.detail]);
  const focus = detailLayout ? { courseId: detailLayout.courseId, name: detailLayout.name, subject: detailLayout.subject } : null;
  const { islands, join } = useMemo(() => worldLayout(scene.world, focus), [scene.world, focus?.courseId]); // eslint-disable-line react-hooks/exhaustive-deps
  const camera = cameraFor(shot, islands, detailLayout);
  const atWorld = shot.kind === "world";
  const activeId = scene.world?.islands.find((island) => island.current?.post)?.course.id ?? scene.world?.islands.find((island) => island.current)?.course.id ?? null;
  const narrow = useThree((t) => t.size.width < 600);
  const center = islands[0]?.position ?? [0, 0, 0];
  const shadowVersion = `${shot.kind}-${detailLayout?.courseId}-${detailLayout?.halls.map((h) => h.building?.posts.map((p) => p.status).join()).join()}-${scene.chest?.state}`;

  return (
    <>
      <CameraRig shot={camera} />
      <hemisphereLight args={["#fbf7ff", "#7f75c9", 1.15]} />
      <directionalLight
        castShadow
        position={add(islands.find((i) => i.courseId === detailLayout?.courseId)?.position ?? center, [16, 26, 12])}
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
        <object3D attach="target" position={islands.find((i) => i.courseId === detailLayout?.courseId)?.position ?? center} />
      </directionalLight>
      <ambientLight intensity={0.3} />
      <StaticShadows version={shadowVersion} />
      <Clouds />

      {islands.map((island, index) =>
        detailLayout && island.courseId === detailLayout.courseId ? (
          <group key={island.courseId}>
            <DetailIsland layout={detailLayout} position={island.position} scene={scene} />
            <WorldSign island={island} show={atWorld} active={island.courseId === activeId} onClick={() => navigate(`/courses/${island.courseId}`)} height={8} />
          </group>
        ) : (
          <SimpleIsland key={island.courseId} island={island} index={index} showSign={atWorld} active={island.courseId === activeId} />
        ),
      )}
      {scene.world && <JoinIsland position={join} show={atWorld} />}
      {islands.slice(1).map((island) => <Bridge key={island.courseId} from={center} to={island.position} />)}
    </>
  );
}

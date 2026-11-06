import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent } from "react";
import * as THREE from "three";

import { STILL } from "./ground";
import { loadSpot, pxToSpot, saveSpot, SPIRIT_SIZE } from "./spirit-spot";
import { spirit, useSpiritGazing, useSpiritSpot, type SpiritMood } from "./spirit-store";

// The AI tutor as a small magical spirit (scripts/world/build-tutor-spirit.mjs):
// a crystal heart with a face, two rune rings, feather wings and sparkle motes.
// It idles with a slow bob; listening, its crystal pulses with the student's
// voice; thinking, its rings spin fast; speaking, its wings beat and it glows.

export const TUTOR_SPIRIT_URL = "/game/tutor-spirit.glb";

export function preloadTutorSpirit() {
  useGLTF.preload(TUTOR_SPIRIT_URL, false, true);
}

/** How each mood moves the spirit: ring speeds (rad/s), wing beat, mote swirl, crystal glow. */
const MOTION: Record<SpiritMood, { ringA: number; ringB: number; flap: number; beat: number; motes: number; glow: number }> = {
  idle: { ringA: 0.45, ringB: -0.35, flap: 0.12, beat: 2.2, motes: 0.35, glow: 0.75 },
  listening: { ringA: 1.1, ringB: -0.9, flap: 0.2, beat: 3.2, motes: 0.8, glow: 0.9 },
  thinking: { ringA: 3.6, ringB: -2.8, flap: 0.16, beat: 4, motes: 2.4, glow: 1 },
  speaking: { ringA: 1.4, ringB: -1.1, flap: 0.55, beat: 9, motes: 1.1, glow: 1.25 },
};

/** Glow parts keep their own colours: the emissive is multiplied by the vertex colour. */
function glowMaterial(intensity: number) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: "#ffffff", emissiveIntensity: intensity, flatShading: true });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= vColor.rgb;");
  };
  return material;
}

function useSpiritModel() {
  const { scene } = useGLTF(TUTOR_SPIRIT_URL, false, true);
  return useMemo(() => {
    const root = scene.getObjectByName("tutorSpirit")!.clone(true);
    const glows: Record<string, THREE.MeshStandardMaterial> = {};
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const material = mesh.material as THREE.Material;
      if (material.name !== "glow") return;
      // meshes hang on `<name>_mesh` holders; the first named ancestor above them is the part
      let named: THREE.Object3D | null = mesh;
      while (named && (!named.name || named.name.endsWith("_mesh"))) named = named.parent;
      const owner = named?.name || "tutorSpirit";
      const glow = glowMaterial(owner === "spiritMotes" ? 1.4 : 0.9);
      glows[owner] = glow;
      mesh.material = glow;
    });
    const part = (name: string) => root.getObjectByName(name) ?? new THREE.Object3D();
    return { root, glows, ringA: part("spiritRingA"), ringB: part("spiritRingB"), wingL: part("spiritWingL"), wingR: part("spiritWingR"), eyes: part("spiritEyes"), motes: part("spiritMotes") };
  }, [scene]);
}

/** How far the spirit turns to face a spot (rad), reached when the spot is a few hundred pixels away. */
const GAZE_YAW = 0.8;
const GAZE_PITCH = 0.5;
const GAZE_REACH = 280;

/**
 * The spirit itself, animated from the shared mood. Its origin is the crystal's centre.
 * `follows`: the spirit sits centred in a canvas of its own, so it can turn its face toward
 * the spot the tutor points at (`spirit.lookAt`), measured from the middle of that canvas.
 */
export function TutorSpirit({ phase = 0, follows = false }: { phase?: number; follows?: boolean }) {
  const model = useSpiritModel();
  const canvas = useThree((state) => state.gl.domElement);
  const live = useRef({ ringA: 0, ringB: 0, speedA: MOTION.idle.ringA, speedB: MOTION.idle.ringB, flap: MOTION.idle.flap, beat: MOTION.idle.beat, motes: MOTION.idle.motes, glow: MOTION.idle.glow, clock: phase, beatPhase: 0, yaw: 0, pitch: 0, gaze: 0 });

  useFrame((_, rawDelta) => {
    if (STILL) return;
    const delta = Math.min(rawDelta, 0.05);
    const { mood, level } = spirit.get();
    const want = MOTION[mood];
    const l = live.current;
    const ease = 1 - Math.exp(-delta * 5);
    l.speedA += (want.ringA - l.speedA) * ease;
    l.speedB += (want.ringB - l.speedB) * ease;
    l.flap += (want.flap - l.flap) * ease;
    l.beat += (want.beat - l.beat) * ease;
    l.motes += (want.motes - l.motes) * ease;
    l.clock += delta;
    l.beatPhase += delta * l.beat;
    const t = l.clock;

    // Facing the spot it points at: the idle sway gives way to a turn toward the point,
    // and the face turns back to the front when the tutor puts its hand down.
    const target = follows ? spirit.get().gaze : null;
    let wantYaw = 0;
    let wantPitch = 0;
    if (target) {
      const box = canvas.getBoundingClientRect();
      wantYaw = Math.tanh((target.x - (box.left + box.width / 2)) / GAZE_REACH) * GAZE_YAW;
      wantPitch = Math.tanh((target.y - (box.top + box.height / 2)) / GAZE_REACH) * GAZE_PITCH;
    }
    const turn = 1 - Math.exp(-delta * 7);
    l.yaw += (wantYaw - l.yaw) * turn;
    l.pitch += (wantPitch - l.pitch) * turn;
    l.gaze += ((target ? 1 : 0) - l.gaze) * turn;

    model.root.position.y = Math.sin(t * 1.6) * 0.035;
    model.root.rotation.y = Math.sin(t * 0.45) * 0.28 * (1 - l.gaze) + l.yaw;
    model.root.rotation.x = l.pitch;
    l.ringA += delta * l.speedA;
    l.ringB += delta * l.speedB;
    model.ringA.rotation.set(0.42, l.ringA, 0);
    model.ringB.rotation.set(0, l.ringB, 0.38);
    const flap = Math.sin(l.beatPhase) * l.flap;
    model.wingL.rotation.set(0, 0.25, -flap);
    model.wingR.rotation.set(0, -0.25, flap);
    model.motes.rotation.y += delta * l.motes;
    model.motes.position.y = Math.sin(t * 0.9) * 0.02;
    // a blink every few seconds, quicker than a frame-perfect timer would look
    const blink = (t + 0.7) % 3.4;
    model.eyes.scale.y = blink < 0.12 ? Math.max(0.12, Math.abs(blink - 0.06) / 0.06) : 1;

    const pulse =
      mood === "listening" ? 0.2 + level() * 1.6 :
      mood === "thinking" ? 0.35 * (0.5 + 0.5 * Math.sin(t * 9)) :
      mood === "speaking" ? 0.3 * (0.5 + 0.5 * Math.sin(t * 14)) :
      0.12 * Math.sin(t * 2);
    l.glow += (want.glow + pulse - l.glow) * ease;
    const heart = model.glows.tutorSpirit;
    if (heart) heart.emissiveIntensity = l.glow;
    for (const ring of ["spiritRingA", "spiritRingB"]) {
      const material = model.glows[ring];
      if (material) material.emissiveIntensity = 0.7 + (l.glow - 0.75) * 0.8;
    }
  });

  return <primitive object={model.root} />;
}

// A drag moves the spirit; a press that hardly moves is a click, which opens or closes the tutor.
const DRAG_FROM = 6;
const KEY_STEP = 24;

/**
 * The spirit in a small view of its own, for when the student is at a station
 * and the room has stopped rendering. Clicking it opens or closes the tutor.
 * Dragging it moves it (Alt + arrow keys too) to whatever part of the screen the
 * student wants to keep clear: the conversation bubble hangs from it wherever it
 * goes (spirit-spot.ts), and it stays there on the next visit.
 */
export function SpiritCorner({ open }: { open: boolean }) {
  const gazing = useSpiritGazing();
  const spot = useSpiritSpot();
  const button = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  // set when a drag ends, for the click that follows the release; the next press or a moment later clears it
  const dragEnded = useRef(false);

  // Where the student put it last time.
  useLayoutEffect(() => {
    spirit.setSpot(loadSpot());
    return () => spirit.setFrame(null);
  }, []);

  // Tell the bubble where the spirit is in its room: now, after every move, and when the room resizes.
  const measure = useCallback(() => {
    const element = button.current;
    const room = element?.offsetParent as HTMLElement | null;
    if (!element || !room) return;
    spirit.setFrame({ left: element.offsetLeft, top: element.offsetTop, size: element.offsetWidth, boxW: room.clientWidth, boxH: room.clientHeight });
  }, []);
  useLayoutEffect(measure, [measure, spot]);
  useEffect(() => {
    const room = button.current?.offsetParent;
    if (!room) return;
    const observer = new ResizeObserver(measure);
    observer.observe(room);
    return () => observer.disconnect();
  }, [measure]);

  /** Put the spirit with its top-left here, kept inside its room. */
  const moveTo = (element: HTMLElement, left: number, top: number) => {
    const room = element.offsetParent as HTMLElement | null;
    if (room) spirit.setSpot(pxToSpot(left, top, element.offsetWidth, room.clientWidth, room.clientHeight));
  };
  const settle = () => {
    dragEnded.current = true;
    setTimeout(() => (dragEnded.current = false), 100);
    saveSpot(spirit.get().spot);
  };
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    dragEnded.current = false;
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: element.offsetLeft, top: element.offsetTop, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < DRAG_FROM) return;
    start.moved = true;
    moveTo(event.currentTarget, start.left + dx, start.top + dy);
  };
  const onPointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (start.moved) settle();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const by = { ArrowLeft: [-KEY_STEP, 0], ArrowRight: [KEY_STEP, 0], ArrowUp: [0, -KEY_STEP], ArrowDown: [0, KEY_STEP] }[event.key];
    if (!event.altKey || !by) return;
    event.preventDefault();
    const element = event.currentTarget;
    moveTo(element, element.offsetLeft + by[0], element.offsetTop + by[1]);
    settle();
  };

  return (
    <button
      ref={button}
      type="button"
      onClick={() => {
        // the click that ends a drag is not a request to open the tutor
        if (dragEnded.current) {
          dragEnded.current = false;
          return;
        }
        spirit.toggle();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
      aria-label={open ? "Tutup tutor" : "Panggil tutor"}
      aria-expanded={open}
      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight"
      title="Seret untuk memindahkan"
      data-gazing={gazing}
      data-moved={spot ? "true" : undefined}
      style={
        spot
          ? { left: `calc((100% - ${SPIRIT_SIZE}px) * ${spot.fx})`, top: `calc((100% - ${SPIRIT_SIZE}px) * ${spot.fy})`, right: "auto" }
          : undefined
      }
      className="spirit-corner pointer-events-auto absolute right-2 top-1 z-30 size-[92px] cursor-grab touch-none select-none rounded-full outline-none transition-transform duration-150 active:scale-[0.95] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#a594f5] sm:right-4"
    >
      <span aria-hidden="true" className="absolute inset-3 rounded-full bg-[radial-gradient(circle,rgba(165,148,245,.45),rgba(165,148,245,0)_70%)]" />
      <Canvas
        className="!pointer-events-none"
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0.02, 1.55], fov: 32 }}
        frameloop={STILL ? "demand" : "always"}
      >
        <hemisphereLight args={["#fff7ee", "#8b7fd0", 1.3]} />
        <directionalLight position={[1.5, 2, 2]} intensity={1.4} color="#fff0dc" />
        <TutorSpirit phase={1.3} follows />
      </Canvas>
    </button>
  );
}

import { PerformanceMonitor, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { gameGsap } from "~/features/game-feel";

import { preloadKit } from "./kit";
import { WorldScene3D } from "./scene";

preloadKit();

// The one canvas of the 3D world. The student shell keeps it mounted while the
// student moves between Dunia, an island and its halls, so each move is the
// camera flying. Loaded lazily: pages outside the world never download three.js.
export default function WorldStage() {
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio || 1));
  const wide = typeof window !== "undefined" && window.innerWidth >= 768;
  return (
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#c9bdf2,#e7e1fb_55%,#f6f2ff)] [color-scheme:light]">
      <Canvas
        orthographic
        shadows="percentage"
        dpr={dpr}
        gl={{ antialias: wide, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        camera={{ position: [40, 34, 40], zoom: 15, near: -200, far: 400 }}
        className="!absolute inset-0 touch-none"
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(1.5, window.devicePixelRatio || 1))} />
        <Suspense fallback={null}>
          <WorldScene3D />
        </Suspense>
      </Canvas>
      <WorldLoader />
    </div>
  );
}

/** Progressive loading: the 2D map holds the frame until the 3D world has arrived. */
function WorldLoader() {
  const { progress, active } = useProgress();
  // Back in the world after a lesson or a post: the model is cached, no loader.
  const [gone, setGone] = useState(() => !active && progress >= 100);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active || progress < 100 || gone) return;
    const tween = gameGsap().to(box.current, { opacity: 0, duration: 0.5, delay: 0.2, ease: "power2.out", onComplete: () => setGone(true) });
    return () => {
      tween.kill();
    };
  }, [active, progress, gone]);
  if (gone) return null;
  return (
    <div ref={box} role="status" aria-live="polite" className="absolute inset-0 z-10 grid place-items-center">
      <picture className="absolute inset-0 -z-10">
        <source media="(max-width: 767px)" srcSet="/game/world-map-portrait.webp" />
        <img src="/game/world-map.webp" alt="" className="size-full object-cover opacity-60" />
      </picture>
      <div className="flex min-w-56 flex-col gap-2 rounded-[18px] bg-white px-4.5 py-3.5 text-[#18153a] shadow-[0_12px_30px_-10px_rgba(24,21,58,.35)]">
        <b className="text-sm">Menyiapkan dunia</b>
        <span className="h-2 overflow-hidden rounded-full bg-[#ece7fb]">
          <i className="block h-full rounded-full bg-[#4bd29f] transition-[width] duration-300" style={{ width: `${Math.max(6, Math.round(progress))}%` }} />
        </span>
        <small className="text-xs text-[#5e5e72] tabular-nums">{Math.round(progress)}%</small>
      </div>
    </div>
  );
}

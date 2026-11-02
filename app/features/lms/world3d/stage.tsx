import { PerformanceMonitor, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useState } from "react";
import * as THREE from "three";
import { usePageReadiness } from "~/features/loading/context";

import { preloadKit } from "./kit";
import { registerVeil } from "./veil";
import { WorldScene3D } from "./scene";

preloadKit();

// The one canvas of the 3D world. The student shell keeps it mounted while the
// student moves between Dunia, an island and its halls, so each move is the
// camera flying. Loaded lazily: pages outside the world never download three.js.
export default function WorldStage() {
  const { active } = useProgress();
  const readiness = usePageReadiness();
  useLayoutEffect(() => { readiness?.setSceneLoading(active); }, [readiness, active]);
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio || 1));
  const wide = typeof window !== "undefined" && window.innerWidth >= 768;
  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_6%,rgba(255,238,206,.9),rgba(255,224,222,.35)_16%,transparent_38%),linear-gradient(180deg,#b7a7ee,#d9cff9_48%,#efe9fe_78%,#f6f2ff)] [color-scheme:light]">
      <Canvas
        orthographic
        shadows="percentage"
        dpr={dpr}
        gl={{ antialias: wide, powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.05;
          // Dev only: lets the e2e scripts measure what the world draws.
          if (import.meta.env.DEV) Object.assign(window, { __world: { gl, scene } });
        }}
        camera={{ position: [40, 34, 40], zoom: 15, near: -200, far: 400 }}
        className="!absolute inset-0 touch-none"
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(1.5, window.devicePixelRatio || 1))} />
        <Suspense fallback={null}>
          <WorldScene3D />
        </Suspense>
      </Canvas>
      <div ref={registerVeil} aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-[#f6f2ff] opacity-0" />
    </div>
  );
}


import { PerformanceMonitor, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import * as THREE from "three";
import { usePageReadiness } from "~/features/loading/context";

import { preloadKit } from "./kit";
import { maxWorldDpr, minWorldDpr } from "./render-quality";
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
  const [dpr, setDpr] = useState(() => maxWorldDpr(window.devicePixelRatio, window.innerWidth, window.innerHeight));
  useEffect(() => {
    const onResize = () => setDpr((current) => Math.min(current, maxWorldDpr(window.devicePixelRatio, window.innerWidth, window.innerHeight)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <div className="isolate absolute inset-0 bg-[radial-gradient(circle_at_86%_6%,rgba(255,238,206,.9),rgba(255,224,222,.35)_16%,transparent_38%),linear-gradient(180deg,#b7a7ee,#d9cff9_48%,#efe9fe_78%,#f6f2ff)] [color-scheme:light]">
      <Canvas
        orthographic
        shadows="percentage"
        dpr={dpr}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.05;
          // Dev only: lets the e2e scripts measure what the world draws.
          if (import.meta.env.DEV) Object.assign(window, { __world: { gl, scene } });
        }}
        camera={{ position: [40, 34, 40], zoom: 15, near: -200, far: 400 }}
        className="!absolute inset-0 touch-none"
      >
        <PerformanceMonitor
          onDecline={() => setDpr((current) => Math.max(Math.min(minWorldDpr(window.devicePixelRatio, window.innerWidth), maxWorldDpr(window.devicePixelRatio, window.innerWidth, window.innerHeight)), current * 0.85))}
          onIncline={() => setDpr((current) => Math.min(maxWorldDpr(window.devicePixelRatio, window.innerWidth, window.innerHeight), current + 0.15))}
        />
        <Suspense fallback={null}>
          <WorldScene3D />
        </Suspense>
      </Canvas>
      <div ref={registerVeil} aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-[#f6f2ff] opacity-0" />
    </div>
  );
}


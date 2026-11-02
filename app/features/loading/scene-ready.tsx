import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usePageReadiness } from "./context";

/** Run inside the model's Suspense boundary, once the relevant scene can draw. */
export function SceneReady({ enabled = true }: { enabled?: boolean }) {
  const session = usePageReadiness();
  const signalled = useRef<object | null>(null);
  useFrame(() => {
    if (!enabled || !session || signalled.current === session) return;
    signalled.current = session;
    // The callback runs before rendering; the next animation frame acknowledges
    // that a frame with the loaded models has actually been submitted.
    requestAnimationFrame(() => session.sceneRendered());
  });
  return null;
}

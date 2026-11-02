import { useEffect, useSyncExternalStore } from "react";

import type { CourseData, EarnedPoint, IslandData, WorkflowStage, WorldData } from "../types";

// What the persistent 3D world shows. The world routes (Dunia, Pulau, Balai)
// write their loader data and their shot here; the canvas in the student shell
// reads it, so moving between them is the camera flying, not a page swap. Data
// from earlier routes is kept, so the other islands stay in the sky.

export type WorldShot =
  | { kind: "world" }
  | { kind: "island"; courseId: string }
  | { kind: "place"; courseId: string; place: "library" | "lab" | "arena" }
  | { kind: "hall"; courseId: string; assignmentId: string };

export type ChestState = "locked" | "ready" | "open";

export type WorldScene = {
  world: WorldData | null;
  detail: { course: CourseData; island: IslandData } | null;
  shot: WorldShot;
  /** A post that was just completed: the focused hall plays it once. */
  lit: { assignmentId: string; stage: WorkflowStage; awards: EarnedPoint[]; onDone: () => void } | null;
  chest: { assignmentId: string; state: ChestState; onOpen: () => void } | null;
  onSelectPost: ((stage: WorkflowStage) => void) | null;
};

let scene: WorldScene = { world: null, detail: null, shot: { kind: "world" }, lit: null, chest: null, onSelectPost: null };
const listeners = new Set<() => void>();

export function setWorldScene(patch: Partial<WorldScene>) {
  scene = { ...scene, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWorldScene() {
  return useSyncExternalStore(subscribe, () => scene, () => scene);
}

const PLACES = ["library", "lab", "arena"] as const;

/**
 * The shot a world URL will show, read before its route has loaded, so the
 * camera takes off on the click and the data arrives during the flight.
 */
export function shotForUrl(pathname: string, search: string): WorldShot | null {
  if (pathname === "/dunia") return { kind: "world" };
  const [first, courseId, third, assignmentId, ...rest] = pathname.split("/").filter(Boolean);
  if (first !== "courses" || !courseId || courseId === "join" || rest.length) return null;
  if (third === "balai" && assignmentId) return { kind: "hall", courseId, assignmentId };
  if (third) return null;
  const place = new URLSearchParams(search).get("tempat");
  return PLACES.find((item) => item === place) ? { kind: "place", courseId, place: place as (typeof PLACES)[number] } : { kind: "island", courseId };
}

/** A world route puts its data and shot on stage while it is open. */
export function useStageScene(patch: Partial<WorldScene>, deps: unknown[]) {
  useEffect(() => {
    setWorldScene({ lit: null, chest: null, onSelectPost: null, ...patch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

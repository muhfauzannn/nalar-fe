import { createContext, useContext, useSyncExternalStore } from "react";

// The 3D world is the default where the device can carry it. Without WebGL, on
// phones with 2 GB of memory or less, and under reduced motion the student gets
// the 2D world pages; a student can also switch either way, remembered per device.

const KEY = "nalar:dunia-3d";
const listeners = new Set<() => void>();

let webgl: boolean | null = null;
function hasWebgl() {
  if (webgl !== null) return webgl;
  try {
    const canvas = document.createElement("canvas");
    webgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return webgl;
}

/** WebGL, more than 2 GB of memory and no reduced-motion preference. */
export function worldCapable() {
  if (typeof window === "undefined") return false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return hasWebgl() && !(memory !== undefined && memory <= 2) && !reduced;
}

function read(): boolean {
  if (typeof window === "undefined") return false;
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(KEY);
  } catch {
    saved = null;
  }
  if (saved === "off") return false;
  if (saved === "on") return hasWebgl();
  return worldCapable();
}

let current: boolean | null = null;
function snapshot() {
  if (current === null) current = read();
  return current;
}

export function setWorld3d(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  current = on && hasWebgl();
  listeners.forEach((listener) => listener());
}

export function useWorld3d() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
    () => false,
  );
}

/** The 3D world routes: Dunia, an island, its classroom and its halls. */
export function isWorldPath(pathname: string) {
  if (pathname === "/dunia") return true;
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "courses" || !parts[1] || parts[1] === "join") return false;
  return parts.length === 2 || (parts.length === 3 && parts[2] === "kelas") || (parts.length === 4 && parts[2] === "balai");
}

/** The layer over the canvas where world routes put their buttons and cards. */
export const WorldOverlayContext = createContext<HTMLElement | null>(null);
export const useWorldOverlay = () => useContext(WorldOverlayContext);

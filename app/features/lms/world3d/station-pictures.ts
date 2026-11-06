import { useSyncExternalStore } from "react";

// Pictures made in the page (outside the 3D scene) that the classroom paints onto its stations: today the lab's
// figure, taken from the real lab (lab-picture.tsx). They are kept for the whole visit, so entering the classroom
// again does not take them again.

const pictures = new Map<string, HTMLCanvasElement>();

export const labPictureKey = (labKey: string) => `lab:${labKey}`;
const listeners = new Set<() => void>();

export const stationPictures = {
  get: (key: string) => pictures.get(key) ?? null,
  set(key: string, picture: HTMLCanvasElement) {
    pictures.set(key, picture);
    listeners.forEach((listener) => listener());
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The picture kept under this key, once it exists. */
export function useStationPicture(key: string | null) {
  return useSyncExternalStore(
    subscribe,
    () => (key ? (pictures.get(key) ?? null) : null),
    () => null,
  );
}

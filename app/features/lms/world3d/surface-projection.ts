import * as THREE from "three";
import ROOM from "./classroom-layout.json";
import type { ClassroomFocus, Surface } from "./classroom-focus";

const surfaces: Record<ClassroomFocus, Surface> = {
  papan: {
    center: ROOM.board.center as Surface["center"],
    width: ROOM.board.width,
    height: ROOM.board.height,
    tilt: 0,
  },
  lab: { center: [-4.1, 1.85, -0.65], width: 2.5, height: 1.7, tilt: -0.45 },
  kuis: { center: [4.35, 2.5, -3.28], width: 2.6, height: 1.85, tilt: 0 },
  tugas: { center: [4, 1.3, 0.95], width: 2.2, height: 1.65, tilt: -0.75 },
};

/** Widen the entrance view on portrait screens while preserving the desktop shot. */
export function classroomHomeFov(width: number, height: number) {
  const aspect = Math.max(0.1, width / Math.max(1, height));
  const base = THREE.MathUtils.degToRad(ROOM.camera.fov) / 2;
  return Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(base) * Math.max(1, 1.35 / aspect))));
}

/** Step back slightly as the screen narrows so the side stations remain visible. */
export function classroomHomePose(width: number, height: number) {
  const aspect = Math.max(0.1, width / Math.max(1, height));
  const stepBack = Math.min(4, Math.max(0, (1.35 - aspect) * 3));
  const [x, y, z] = ROOM.camera.position;
  return {
    p: [x!, y!, z! + stepBack] as [number, number, number],
    t: ROOM.camera.target as [number, number, number],
  };
}

/** Open station work surfaces also fit portrait screens, like an unfolded sheet. */
export function classroomSurface(
  focus: ClassroomFocus,
  aspect?: number,
): Surface {
  const surface = surfaces[focus];
  if (focus === "papan" || aspect === undefined) return surface;
  const height = Math.min(
    4.4,
    surface.width / Math.max(0.45, Math.min(1.55, aspect)),
  );
  const halfHeight = (height * Math.cos(surface.tilt)) / 2;
  const center: Surface["center"] = [...surface.center];
  center[1] = Math.max(
    halfHeight + 0.12,
    Math.min(ROOM.room.height - halfHeight - 0.12, center[1]),
  );
  return { ...surface, center, height };
}

/** Reserve room above the physical surface for the classroom's back control. */
export function stationAspect(width: number, height: number) {
  return Math.max(1, width - 32) / Math.max(1, height - 112);
}

export function stationPose(
  focus: ClassroomFocus,
  width: number,
  height: number,
) {
  const surface = classroomSurface(focus, stationAspect(width, height));
  const half = Math.tan(THREE.MathUtils.degToRad(ROOM.camera.fov) / 2);
  const safeWidth = Math.max(1, width - 32) / width;
  const safeHeight = Math.max(1, height - 112) / height;
  const distance = Math.max(
    surface.height / (2 * half * safeHeight),
    surface.width / (2 * half * (width / height) * safeWidth),
  );
  const target = new THREE.Vector3(...surface.center);
  const normal = new THREE.Vector3(0, 0, 1).applyAxisAngle(
    new THREE.Vector3(1, 0, 0),
    surface.tilt,
  );
  // Shift the view upward so the surface lands below the top bar.
  const up = new THREE.Vector3(0, 1, 0).applyAxisAngle(
    new THREE.Vector3(1, 0, 0),
    surface.tilt,
  );
  target.addScaledVector(up, (distance * half * 64) / height);
  const position = target.clone().addScaledVector(normal, distance);
  return {
    p: position.toArray() as [number, number, number],
    t: target.toArray() as [number, number, number],
  };
}

export function stationRect(
  camera: THREE.PerspectiveCamera,
  focus: ClassroomFocus,
  width: number,
  height: number,
) {
  const surface = classroomSurface(focus, stationAspect(width, height));
  const center = new THREE.Vector3(...surface.center);
  const rotation = new THREE.Euler(surface.tilt, 0, 0);
  const a = new THREE.Vector3(-surface.width / 2, surface.height / 2, 0)
    .applyEuler(rotation)
    .add(center)
    .project(camera);
  const b = new THREE.Vector3(surface.width / 2, -surface.height / 2, 0)
    .applyEuler(rotation)
    .add(center)
    .project(camera);
  const left = ((a.x + 1) / 2) * width,
    top = ((1 - a.y) / 2) * height;
  return {
    left,
    top,
    width: ((b.x - a.x) / 2) * width,
    height: ((a.y - b.y) / 2) * height,
  };
}

import * as THREE from "three";
import type { Vec3 } from "./layout";

export type WorldExtent = { position: Vec3; radius: number };
const ISO: Vec3 = [40, 34, 40];

/** Fit all island bounds between the phone's header and bottom controls. */
export function frameWorld(
  extents: WorldExtent[],
  width: number,
  height: number,
) {
  if (!extents.length || width <= 0 || height <= 0) return null;
  const camera = new THREE.OrthographicCamera();
  camera.position.set(...ISO);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const {
    position: [x, y, z],
    radius,
  } of extents) {
    for (const dx of [-radius, radius])
      for (const dz of [-radius, radius])
        for (const dy of [-18, 12]) {
          const point = new THREE.Vector3(x + dx, y + dy, z + dz);
          const px = point.dot(right),
            py = point.dot(up);
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, py);
          maxY = Math.max(maxY, py);
        }
  }
  const top = Math.min(132, height * 0.24),
    bottom = Math.min(230, height * 0.36);
  const usableWidth = Math.max(1, width - 32),
    usableHeight = Math.max(1, height - top - bottom);
  const zoom = Math.min(
    11,
    usableWidth / (maxX - minX),
    usableHeight / (maxY - minY),
  );
  const centerX = (minX + maxX) / 2;
  const screenCenter = top + usableHeight / 2;
  const centerY = (minY + maxY) / 2 + (screenCenter - height / 2) / zoom;
  const target = right.multiplyScalar(centerX).add(up.multiplyScalar(centerY));
  return { target: target.toArray() as Vec3, zoom };
}

import { expect, test } from "@playwright/test";
import * as THREE from "three";
import {
  frameWorld,
  type WorldExtent,
} from "../app/features/lms/world3d/world-camera";
import {
  maxWorldDpr,
  minWorldDpr,
} from "../app/features/lms/world3d/render-quality";

const islands: WorldExtent[] = [
  { position: [0, 0, 0], radius: 12 },
  { position: [28, 0, 15], radius: 14 },
  { position: [2, 1, 32], radius: 11 },
  { position: [-27, -1, 18], radius: 12 },
  { position: [-18, 0, -27], radius: 10 },
  { position: [18, 2, -26], radius: 10 },
];
for (const [width, height] of [
  [320, 520],
  [390, 700],
  [667, 320],
  [768, 900],
]) {
  test(`all islands fit the unobstructed world at ${width}×${height}`, () => {
    const fit = frameWorld(islands, width!, height!);
    expect(fit).not.toBeNull();
    const camera = new THREE.OrthographicCamera(
      -width! / 2,
      width! / 2,
      height! / 2,
      -height! / 2,
      -200,
      400,
    );
    camera.position.set(
      fit!.target[0] + 40,
      fit!.target[1] + 34,
      fit!.target[2] + 40,
    );
    camera.zoom = fit!.zoom;
    camera.lookAt(...fit!.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const top = Math.min(132, height! * 0.24),
      bottom = Math.min(230, height! * 0.36);
    for (const {
      position: [x, y, z],
      radius,
    } of islands) {
      for (const dx of [-radius, radius])
        for (const dz of [-radius, radius])
          for (const dy of [-18, 12]) {
            const p = new THREE.Vector3(x + dx, y + dy, z + dz).project(camera);
            const screenX = ((p.x + 1) * width!) / 2,
              screenY = ((1 - p.y) * height!) / 2;
            expect(screenX).toBeGreaterThanOrEqual(15.99);
            expect(screenX).toBeLessThanOrEqual(width! - 15.99);
            expect(screenY).toBeGreaterThanOrEqual(top - 0.01);
            expect(screenY).toBeLessThanOrEqual(height! - bottom + 0.01);
          }
    }
  });
}

test("empty or unmeasured worlds do not produce an invalid camera", () => {
  expect(frameWorld([], 390, 700)).toBeNull();
  expect(frameWorld(islands, 0, 700)).toBeNull();
});

test("phone rendering retains detail while respecting the pixel budget and native DPR", () => {
  expect(maxWorldDpr(3, 390, 844)).toBe(2);
  expect(minWorldDpr(3, 390)).toBe(1.25);
  expect(maxWorldDpr(1, 390, 844)).toBe(1);
  const width = 1200,
    height = 2000;
  const dpr = maxWorldDpr(3, width, height);
  expect(width * height * dpr * dpr).toBeLessThanOrEqual(3_000_000.001);
});

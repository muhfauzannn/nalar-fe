import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { MeshoptDecoder } from "meshoptimizer";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { createClassroomInstance } from "../app/features/lms/world3d/classroom-model";

let cachedScene: THREE.Group;
test.beforeAll(async () => {
  const bytes = await readFile(new URL("../public/game/classroom.glb", import.meta.url));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const asset = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer, "");
  cachedScene = asset.scene;
});

test("entering, leaving and re-entering the classroom preserves the cached model", () => {
  const template = cachedScene.getObjectByName("classroom")!;
  const cachedChildren = [...cachedScene.children];
  const canvasScene = new THREE.Scene();

  for (let visit = 0; visit < 10; visit++) {
    const room = createClassroomInstance(cachedScene);
    expect(room).not.toBe(template);
    // This is the same reparenting performed by R3F when it mounts a primitive.
    canvasScene.add(room);
    expect(room.parent).toBe(canvasScene);
    expect(template.parent).toBe(cachedScene);
    expect(cachedScene.getObjectByName("classroom")).toBe(template);
    canvasScene.remove(room);
    expect(cachedScene.children).toEqual(cachedChildren);
  }
});

test("switching courses creates independent room hierarchies from the same GLTF", () => {
  const firstCourse = new THREE.Scene();
  const secondCourse = new THREE.Scene();
  const firstRoom = createClassroomInstance(cachedScene);
  const secondRoom = createClassroomInstance(cachedScene);
  firstCourse.add(firstRoom);
  secondCourse.add(secondRoom);
  expect(firstRoom.parent).toBe(firstCourse);
  expect(secondRoom.parent).toBe(secondCourse);
  expect(firstRoom.children[0]).not.toBe(secondRoom.children[0]);
  firstRoom.position.x = 10;
  expect(secondRoom.position.x).toBe(0);
  expect(cachedScene.getObjectByName("classroom")?.position.x).toBe(0);
});

test("room copies share static GPU resources without changing the template's flags", () => {
  const template = cachedScene.getObjectByName("classroom")!;
  let originalMesh: THREE.Mesh | undefined;
  template.traverse((node) => { if (!originalMesh && (node as THREE.Mesh).isMesh) originalMesh = node as THREE.Mesh; });
  expect(originalMesh).toBeDefined();
  const castShadow = originalMesh!.castShadow;
  const receiveShadow = originalMesh!.receiveShadow;
  const room = createClassroomInstance(cachedScene);
  const mesh = room.getObjectByName(originalMesh!.name) as THREE.Mesh;
  expect(mesh).not.toBe(originalMesh);
  expect(mesh.geometry).toBe(originalMesh!.geometry);
  expect(mesh.material).toBe(originalMesh!.material);
  expect(mesh.castShadow).toBe(true);
  expect(mesh.receiveShadow).toBe(true);
  expect(originalMesh!.castShadow).toBe(castShadow);
  expect(originalMesh!.receiveShadow).toBe(receiveShadow);
});

import type { Mesh, Object3D } from "three";

/** Keep the cached GLTF as a template: Three.js reparents objects on add(). */
export function createClassroomInstance(scene: Object3D) {
  const template = scene.getObjectByName("classroom");
  if (!template) throw new Error("classroom.glb is missing the classroom node");

  // Mounting the template itself removes it from the GLTF scene. A subsequent
  // visit (or a course change) would then look up undefined and fail in traverse.
  // Clone the hierarchy, while sharing the static geometry and materials.
  const room = template.clone(true);
  room.traverse((object) => {
    if ((object as Mesh).isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return room;
}

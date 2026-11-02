import { expect, test } from "@playwright/test";
import * as THREE from "three";
import {
  classroomFocus,
  classroomUrl,
  type ClassroomFocus,
} from "../app/features/lms/world3d/classroom-focus";
import { createServer } from "vite";
let classroomHomeFov: typeof import("../app/features/lms/world3d/surface-projection").classroomHomeFov;
let classroomHomePose: typeof import("../app/features/lms/world3d/surface-projection").classroomHomePose;
let stationPose: typeof import("../app/features/lms/world3d/surface-projection").stationPose;
let stationRect: typeof import("../app/features/lms/world3d/surface-projection").stationRect;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  const server = await createServer({
    configFile: "tests/vite.config.ts",
    server: { middlewareMode: true, hmr: false },
  });
  try {
    ({ classroomHomeFov, classroomHomePose, stationPose, stationRect } = await server.ssrLoadModule(
      "/app/features/lms/world3d/surface-projection.ts",
    ));
  } finally {
    await server.close();
  }
});
import { shotForUrl } from "../app/features/lms/world3d/store";
import {
  assignmentDraftKey,
  clearActivityDraft,
  quizDraftKey,
  readActivityDraft,
  writeActivityDraft,
} from "../app/features/lms/lib/activity-drafts";

for (const focus of [
  "papan",
  "lab",
  "kuis",
  "tugas",
] satisfies ClassroomFocus[]) {
  test(`${focus} keeps a deep link inside the classroom`, () => {
    const url = new URL(
      classroomUrl("course-a", {
        focus,
        lessonId: "lesson-a",
        labId: "lab-a",
        quizId: "quiz-a",
        assignmentId: "assignment-a",
      }),
      "http://localhost",
    );
    expect(url.pathname).toBe("/courses/course-a/kelas");
    expect(classroomFocus(url.searchParams)).toBe(focus);
    expect(shotForUrl(url.pathname, url.search)).toEqual({
      kind: "classroom",
      courseId: "course-a",
      focus,
    });
  });
  for (const [width, height] of [
    [1280, 800],
    [390, 700],
    [800, 390],
  ]) {
    test(`${focus} has a readable surface clear of the toolbar at ${width}×${height}`, () => {
      const pose = stationPose(focus, width!, height!);
      const camera = new THREE.PerspectiveCamera(
        46,
        width! / height!,
        0.05,
        60,
      );
      camera.position.fromArray(pose.p);
      camera.lookAt(...pose.t);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      const rect = stationRect(camera, focus, width!, height!);
      expect(rect.left).toBeGreaterThanOrEqual(15.9);
      expect(rect.top).toBeGreaterThanOrEqual(87.9);
      expect(rect.left + rect.width).toBeLessThanOrEqual(width! - 15.9);
      expect(rect.top + rect.height).toBeLessThanOrEqual(height! - 23.9);
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
    });
  }
}

test("invalid focus returns to the room and closing keeps the chosen material", () => {
  expect(classroomFocus(new URLSearchParams("fokus=unknown"))).toBeNull();
  expect(classroomUrl("course-a", { lessonId: "lesson-a" })).toBe(
    "/courses/course-a/kelas?materi=lesson-a",
  );
});

test("unfinished writing survives leaving a station and is cleared after confirmation", () => {
  const storage = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  try {
    const draft = assignmentDraftKey("submission-a", "1_independent_effort");
    writeActivityDraft(draft, "Pengamatan yang belum dikumpulkan");
    expect(readActivityDraft(draft)).toBe("Pengamatan yang belum dikumpulkan");
    expect(
      readActivityDraft(
        assignmentDraftKey("submission-b", "1_independent_effort"),
      ),
    ).toBeUndefined();
    const answer = quizDraftKey("attempt-a", "question-a");
    writeActivityDraft(answer, "option-a");
    clearActivityDraft(answer);
    expect(readActivityDraft(answer)).toBeUndefined();
    expect(readActivityDraft(draft)).toBeTruthy();
  } finally {
    if (previous) Object.defineProperty(globalThis, "sessionStorage", previous);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});


test("the classroom entrance widens on phones and keeps the side stations in view", () => {
  for (const [width, height] of [[320, 520], [390, 650], [800, 300]]) {
    const pose = classroomHomePose(width!, height!);
    const camera = new THREE.PerspectiveCamera(classroomHomeFov(width!, height!), width! / height!, 0.05, 60);
    camera.position.fromArray(pose.p);
    camera.lookAt(...pose.t);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (const station of [[0, 2.75, -3.94], [-4.55, 1.2, -1], [4, 0.92, 0.9], [4.7, 2, -3.5]]) {
      const point = new THREE.Vector3(...station as [number, number, number]).project(camera);
      expect(Math.abs(point.x)).toBeLessThan(1);
    }
  }
  expect(classroomHomeFov(1280, 800)).toBe(46);
  expect(classroomHomePose(1280, 800).p).toEqual([0.6, 2.9, 7.4]);
});

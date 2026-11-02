import { expect, test } from "@playwright/test";

import type { CourseData, IslandData, LessonData } from "../app/features/lms/types";
import { classroomForScene, shotForUrl, type WorldScene } from "../app/features/lms/world3d/store";

const course: CourseData = {
  course: { id: "course-a", enrollmentId: "enrollment-a", name: "A", description: null, status: "published", subjectName: "Matematika", subjectCode: "MAT" },
  teachers: [],
  progress: { completed: 0, total: 0, percentage: 0, lessons: { completed: 0, total: 0 }, assignments: { completed: 0, total: 0 }, quizzes: { completed: 0, total: 0 } },
  modules: [], assignments: [], quizzes: [], announcements: [],
};
const island: IslandData = {
  course: { id: "course-a", name: "A", subjectName: "Matematika" },
  points: { total: 0 }, labs: [], badges: [], bridge: { planks: 0, total: 0, students: 0 }, buildings: [], recent: [],
};
const lesson: LessonData = {
  id: "lesson-a", courseId: "course-a", title: "Materi A", content: null, moduleTitle: "Modul A", courseName: "A", enrollmentId: "enrollment-a", progressStatus: null, resources: [], labs: [],
};
const world: WorldScene = {
  world: null, detail: null, shot: { kind: "world" }, lesson: null, lit: null, chest: null, onSelectPost: null,
};
const loaded: WorldScene = { ...world, detail: { course, island }, lesson, shot: { kind: "classroom", courseId: "course-a", board: false } };

test("a cold world cannot open the room before the classroom loader commits", () => {
  const target = shotForUrl("/courses/course-a/kelas", "?fokus=papan");
  expect(target).toEqual({ kind: "classroom", courseId: "course-a", board: true });
  expect(classroomForScene(world)).toBeNull();
  // Even a premature shot without its data must not mount Classroom.
  expect(classroomForScene({ ...world, shot: target! })).toBeNull();
  expect(classroomForScene(loaded)).toMatchObject({ courseId: "course-a", lesson, board: false });
});

test("prefetched course data alone does not open the classroom", () => {
  expect(classroomForScene({ ...loaded, shot: { kind: "place", courseId: "course-a", place: "library" } })).toBeNull();
});

test("a classroom never consumes a previously visited course's data", () => {
  expect(classroomForScene({ ...loaded, shot: { kind: "classroom", courseId: "course-b", board: false } })).toBeNull();
  expect(classroomForScene({ ...loaded, detail: { course, island: { ...island, course: { ...island.course, id: "course-b" } } } })).toBeNull();
  expect(classroomForScene({ ...loaded, lesson: { ...lesson, courseId: "course-b" } })).toBeNull();
});

test("refreshing directly into the classroom and changing board focus use the loaded lesson", () => {
  expect(classroomForScene(loaded)).toMatchObject({ courseId: "course-a", course, island, lesson });
  expect(classroomForScene({ ...loaded, shot: { kind: "classroom", courseId: "course-a", board: true } })).toMatchObject({ board: true, lesson });
});

test("a loaded classroom with no lessons is still ready", () => {
  expect(classroomForScene({ ...loaded, lesson: null })).toMatchObject({ courseId: "course-a", lesson: null });
});

test("leaving the classroom stops selecting it even though its data stays cached", () => {
  expect(classroomForScene({ ...loaded, shot: { kind: "world" } })).toBeNull();
});

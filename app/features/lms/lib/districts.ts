import { LABS } from "~/features/labs";
import { formatDateTime } from "./format";
import { postNames } from "./game";
import type { CourseData, IslandData } from "../types";

// The places of a course's island, grouped by module ("districts"): lessons in
// the library, labs, quizzes in the arena and assignments as halls. The 2D
// island page lists them; the 3D world places them as buildings.

const finished = new Set(["closed", "completed", "expired", "graded", "returned", "submitted"]);

export type Place = "library" | "lab" | "arena" | "hall";
export type Stop = {
  key: string;
  place: Place;
  title: string;
  href: string;
  done: boolean;
  detail: string;
  posts?: IslandData["buildings"][number]["posts"];
};

export function districtsOf(course: CourseData, island: IslandData) {
  const buildingOf = new Map(island.buildings.map((item) => [item.assignmentId, item]));
  const stopsFor = (moduleId: string | null, lessons: CourseData["modules"][number]["lessons"]) => {
    const stops: Stop[] = [];
    for (const lesson of lessons) {
      stops.push({
        key: `lesson-${lesson.id}`,
        place: "library",
        title: lesson.title,
        href: `/lessons/${lesson.id}`,
        done: lesson.status === "completed",
        detail: lesson.status === "completed" ? "Sudah dibaca" : lesson.status === "in_progress" ? "Sedang dibaca" : "Materi",
      });
      for (const lab of island.labs.filter((item) => item.lessonId === lesson.id)) {
        stops.push({
          key: `lab-${lab.id}`,
          place: "lab",
          title: LABS[lab.labKey]?.title ?? lab.labKey,
          href: `/lessons/${lesson.id}?ruang=lab`,
          done: lab.challenges > 0 && lab.solved >= lab.challenges,
          detail: `${lab.solved} dari ${lab.challenges} tantangan`,
        });
      }
    }
    for (const quiz of course.quizzes.filter((item) => item.moduleId === moduleId)) {
      const isDone = finished.has(quiz.attemptStatus ?? "");
      stops.push({
        key: `quiz-${quiz.id}`,
        place: "arena",
        title: quiz.title,
        href: `/quizzes/${quiz.id}`,
        done: isDone,
        detail: isDone ? "Selesai" : quiz.dueAt ? `Tenggat ${formatDateTime(quiz.dueAt)}` : "Latihan",
      });
    }
    for (const assignment of course.assignments.filter((item) => item.moduleId === moduleId)) {
      const building = buildingOf.get(assignment.id);
      const lit = building?.posts.filter((post) => post.status === "done").length ?? 0;
      const current = building?.posts.find((post) => post.status === "current");
      stops.push({
        key: `hall-${assignment.id}`,
        place: "hall",
        title: assignment.title,
        href: `/courses/${course.course.id}/balai/${assignment.id}`,
        done: Boolean(building?.chestOpen),
        detail: building?.chestOpen
          ? "Peti terbuka"
          : current
            ? `${lit}/5 pos · berikutnya ${postNames[current.stage]}`
            : `Tenggat ${formatDateTime(assignment.dueAt)}`,
        posts: building?.posts,
      });
    }
    return stops;
  };

  const districts = course.modules
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((module) => ({ id: module.id, title: module.title, stops: stopsFor(module.id, module.lessons) }));
  const loose = stopsFor(null, []);
  if (loose.length > 0) districts.push({ id: "umum", title: "Alun-alun", stops: loose });
  return districts.filter((district) => district.stops.length > 0);
}

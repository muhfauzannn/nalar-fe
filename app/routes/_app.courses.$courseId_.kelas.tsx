import { Navigate, useSearchParams, type ShouldRevalidateFunctionArgs } from "react-router";

import type { Route } from "./+types/_app.courses.$courseId_.kelas";
import { ClassroomOverlay, CourseDetailPageSkeleton, LessonPage, studentApi, useWorld3d } from "~/features/lms";

// The course's classroom in the 3D world: the lesson on the blackboard
// (?materi=<lessonId>, the first unfinished one by default), read at the board
// with ?fokus=papan. Without the 3D world it is the lesson page itself.
export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.courseId) throw new Response("Course tidak ditemukan", { status: 404 });
  const asked = new URL(request.url).searchParams.get("materi");
  // A lesson named in the URL loads alongside the course instead of after it.
  const early = asked ? studentApi.lesson(request, asked).catch(() => null) : null;
  const [course, island] = await Promise.all([
    studentApi.course(request, params.courseId),
    studentApi.island(request, params.courseId),
  ]);
  const lessons = course.modules.slice().sort((a, b) => a.position - b.position).flatMap((module) => module.lessons);
  const chosen = lessons.find((item) => item.id === asked) ?? lessons.find((item) => item.status !== "completed") ?? lessons[0] ?? null;
  const lesson = !chosen ? null : chosen.id === asked && early ? await early : await studentApi.lesson(request, chosen.id);
  return { course, island, lesson };
}

// Stepping up to the board (?fokus=papan) only moves the camera.
export function shouldRevalidate({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  const same = currentUrl.pathname === nextUrl.pathname && currentUrl.searchParams.get("materi") === nextUrl.searchParams.get("materi");
  if (!formMethod && same && currentUrl.search !== nextUrl.search) return false;
  return defaultShouldRevalidate;
}

export function HydrateFallback() {
  return <CourseDetailPageSkeleton />;
}

export function meta() {
  return [{ title: "Kelas | NALAR" }];
}

export default function ClassroomRoute({ loaderData, params }: Route.ComponentProps) {
  const world3d = useWorld3d();
  const [search] = useSearchParams();
  const board = search.get("fokus") === "papan";
  if (world3d) return <ClassroomOverlay course={loaderData.course} island={loaderData.island} lesson={loaderData.lesson} board={board} />;
  return loaderData.lesson ? <LessonPage data={loaderData.lesson} /> : <Navigate to={`/courses/${params.courseId}/daftar`} replace />;
}

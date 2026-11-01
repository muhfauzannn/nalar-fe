import type { Route } from "./+types/_app.courses.$courseId";
import {
  CourseDetailPageSkeleton,
  IslandPage,
  studentApi,
} from "~/features/lms";

// A course is shown as its island; the plain list lives at /courses/:id/daftar.
export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.courseId) throw new Response("Course tidak ditemukan", { status: 404 });
  const [course, island] = await Promise.all([
    studentApi.course(request, params.courseId),
    studentApi.island(request, params.courseId),
  ]);
  return { course, island };
}

export function HydrateFallback() {
  return <CourseDetailPageSkeleton />;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Pulau | NALAR" }];
}

export default function CourseIslandRoute({ loaderData }: Route.ComponentProps) {
  return <IslandPage course={loaderData.course} island={loaderData.island} />;
}

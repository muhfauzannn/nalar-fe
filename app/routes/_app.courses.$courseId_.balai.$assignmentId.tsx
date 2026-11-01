import type { Route } from "./+types/_app.courses.$courseId_.balai.$assignmentId";
import { BalaiPage, CourseDetailPageSkeleton, studentApi } from "~/features/lms";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.courseId) throw new Response("Course tidak ditemukan", { status: 404 });
  return studentApi.island(request, params.courseId);
}

export function HydrateFallback() {
  return <CourseDetailPageSkeleton />;
}

export function meta() {
  return [{ title: "Balai | NALAR" }];
}

export default function BalaiRoute({ loaderData, params }: Route.ComponentProps) {
  return <BalaiPage data={loaderData} assignmentId={params.assignmentId} />;
}

import type { Route } from "./+types/_app.courses.$courseId_.island";
import { CourseDetailPageSkeleton, IslandPage, studentApi } from "~/features/lms";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.courseId) throw new Response("Course tidak ditemukan", { status: 404 });
  return studentApi.island(request, params.courseId);
}

export function HydrateFallback() {
  return <CourseDetailPageSkeleton />;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Pulau | NALAR" }];
}

export default function IslandRoute({ loaderData }: Route.ComponentProps) {
  return <IslandPage data={loaderData} />;
}

import type { Route } from "./+types/_app.courses.$courseId";
import {
  CourseDetailPage,
  CourseDetailPageSkeleton,
  studentApi,
} from "~/features/lms";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.courseId) throw new Response("Course tidak ditemukan", { status: 404 });
  return studentApi.course(request, params.courseId);
}

export function HydrateFallback() {
  return <CourseDetailPageSkeleton />;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Detail Course | NALAR" }];
}

export default function CourseDetailRoute({ loaderData }: Route.ComponentProps) {
  return <CourseDetailPage data={loaderData} />;
}

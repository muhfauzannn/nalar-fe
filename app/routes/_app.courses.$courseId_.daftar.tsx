import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation } from "react-router";
import type { Route } from "./+types/_app.courses.$courseId_.daftar";
import {
  CourseDetailPage,
  studentApi,
} from "~/features/lms";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.courseId) throw new Response("Course tidak ditemukan", { status: 404 });
  return studentApi.course(request, params.courseId);
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Detail Course | NALAR" }];
}

export default function CourseListRoute({ loaderData }: Route.ComponentProps) {
  return <CourseDetailPage data={loaderData} />;
}

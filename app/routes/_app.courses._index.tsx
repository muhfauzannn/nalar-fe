import type { Route } from "./+types/_app.courses._index";
import {
  CoursesPage,
  CoursesPageSkeleton,
  studentApi,
} from "~/features/lms";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return studentApi.courses(request);
}

export function HydrateFallback() {
  return <CoursesPageSkeleton />;
}

export function meta() {
  return [{ title: "Course Saya | NALAR" }];
}

export default function CoursesRoute({ loaderData }: Route.ComponentProps) {
  return <CoursesPage data={loaderData} />;
}

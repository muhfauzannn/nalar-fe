import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation } from "react-router";
import type { Route } from "./+types/_app.courses._index";
import {
  CoursesPage,
  studentApi,
} from "~/features/lms";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return studentApi.courses(request);
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export function meta() {
  return [{ title: "Course Saya | NALAR" }];
}

export default function CoursesRoute({ loaderData }: Route.ComponentProps) {
  return <CoursesPage data={loaderData} />;
}

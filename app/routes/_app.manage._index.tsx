import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation } from "react-router";
import type { ShouldRevalidateFunctionArgs } from "react-router";
import type { Route } from "./+types/_app.manage._index";
import { manageApi, MyCoursesPage } from "~/features/authoring";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  // The subjects are for the "Buat course" sheet that opens over this list.
  const [{ courses }, { subjects }] = await Promise.all([manageApi.courses(request), manageApi.subjects(request)]);
  return { courses, subjects };
}

// Opening the sheet (?buat) changes the URL but not the courses. Creating a course
// leaves for its editor, so nothing here needs a refresh.
export function shouldRevalidate({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (!formMethod && currentUrl.pathname === nextUrl.pathname) return false;
  return defaultShouldRevalidate;
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export function meta() {
  return [{ title: "Kelola Course | NALAR" }];
}

export default function ManageCoursesRoute({ loaderData }: Route.ComponentProps) {
  return <MyCoursesPage data={loaderData} />;
}

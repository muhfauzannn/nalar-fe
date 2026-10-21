import type { Route } from "./+types/_app.manage._index";
import { ManageCoursesPageSkeleton } from "~/features/lms";
import { manageApi, MyCoursesPage } from "~/features/authoring";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return manageApi.courses(request);
}

export function HydrateFallback() {
  return <ManageCoursesPageSkeleton />;
}

export function meta() {
  return [{ title: "Kelola Course | NALAR" }];
}

export default function ManageCoursesRoute({ loaderData }: Route.ComponentProps) {
  return <MyCoursesPage data={loaderData} />;
}

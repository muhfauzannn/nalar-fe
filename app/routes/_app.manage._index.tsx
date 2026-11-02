import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation } from "react-router";
import type { Route } from "./+types/_app.manage._index";
import { manageApi, MyCoursesPage } from "~/features/authoring";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return manageApi.courses(request);
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

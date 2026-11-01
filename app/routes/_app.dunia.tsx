import { useRouteLoaderData } from "react-router";

import type { Route } from "./+types/_app.dunia";
import { CourseDetailPageSkeleton, studentApi, WorldPage, type StudentShellData } from "~/features/lms";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return studentApi.world(request);
}

export function HydrateFallback() {
  return <CourseDetailPageSkeleton />;
}

export function meta() {
  return [{ title: "Dunia | NALAR" }];
}

export default function WorldRoute({ loaderData }: Route.ComponentProps) {
  const shell = useRouteLoaderData<StudentShellData>("routes/_app");
  return <WorldPage data={loaderData} name={shell?.user.name ?? "Siswa"} />;
}

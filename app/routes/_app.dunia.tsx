import { useRouteLoaderData } from "react-router";

import type { Route } from "./+types/_app.dunia";
import { CourseDetailPageSkeleton, studentApi, useWorld3d, WorldOverlay, WorldPage, type StudentShellData } from "~/features/lms";

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
  const name = shell?.user.name ?? "Siswa";
  // The 3D world where the device carries it; the 2D page otherwise.
  return useWorld3d() ? <WorldOverlay data={loaderData} name={name} /> : <WorldPage data={loaderData} name={name} />;
}

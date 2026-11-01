import type { Route } from "./+types/_app.dashboard";
import {
  DashboardPage,
  DashboardPageSkeleton,
  studentApi,
} from "~/features/lms";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  // Poin Nalar is extra: the dashboard still opens when it cannot be read.
  const [data, points] = await Promise.all([
    studentApi.dashboard(request),
    studentApi.points(request).catch(() => null),
  ]);
  return { data, points };
}

export function HydrateFallback() {
  return <DashboardPageSkeleton />;
}

export function meta() {
  return [{ title: "Dashboard Siswa | NALAR" }];
}

export default function DashboardRoute({ loaderData }: Route.ComponentProps) {
  return <DashboardPage data={loaderData.data} points={loaderData.points} />;
}

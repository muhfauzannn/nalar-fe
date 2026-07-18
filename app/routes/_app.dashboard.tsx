import type { Route } from "./+types/_app.dashboard";
import {
  DashboardPage,
  DashboardPageSkeleton,
  studentApi,
} from "~/features/lms";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return studentApi.dashboard(request);
}

export function HydrateFallback() {
  return <DashboardPageSkeleton />;
}

export function meta() {
  return [{ title: "Dashboard Siswa | NALAR" }];
}

export default function DashboardRoute({ loaderData }: Route.ComponentProps) {
  return <DashboardPage data={loaderData} />;
}

import type { Route } from "./+types/_app.manage.assignments.$assignmentId_.analytics";
import { ActivityPageSkeleton } from "~/features/lms";
import { AssignmentAnalyticsPage, manageApi } from "~/features/authoring";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.assignmentId) throw new Response("Assignment tidak ditemukan", { status: 404 });
  return manageApi.assignmentAnalytics(request, params.assignmentId);
}

export function HydrateFallback() {
  return <ActivityPageSkeleton />;
}

export function meta() {
  return [{ title: "Analitik Kelas | NALAR" }];
}

export default function AssignmentAnalyticsRoute({ loaderData }: Route.ComponentProps) {
  return <AssignmentAnalyticsPage data={loaderData} />;
}

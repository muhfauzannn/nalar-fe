import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation } from "react-router";
import type { Route } from "./+types/_app.manage.assignments.$assignmentId_.analytics";
import { AssignmentAnalyticsPage, manageApi } from "~/features/authoring";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.assignmentId) throw new Response("Assignment tidak ditemukan", { status: 404 });
  return manageApi.assignmentAnalytics(request, params.assignmentId);
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export function meta() {
  return [{ title: "Analitik Kelas | NALAR" }];
}

export default function AssignmentAnalyticsRoute({ loaderData }: Route.ComponentProps) {
  return <AssignmentAnalyticsPage data={loaderData} />;
}

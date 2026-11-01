import type { Route } from "./+types/_app.manage.assignments.$assignmentId_.analytics_.$submissionId";
import { ActivityPageSkeleton } from "~/features/lms";
import { manageApi, SubmissionProcessPage } from "~/features/authoring";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.assignmentId || !params.submissionId) {
    throw new Response("Pengerjaan tidak ditemukan", { status: 404 });
  }
  return manageApi.submissionProcess(request, params.assignmentId, params.submissionId);
}

export function HydrateFallback() {
  return <ActivityPageSkeleton />;
}

export function meta() {
  return [{ title: "Proses Siswa | NALAR" }];
}

export default function SubmissionProcessRoute({ loaderData }: Route.ComponentProps) {
  return <SubmissionProcessPage data={loaderData} />;
}

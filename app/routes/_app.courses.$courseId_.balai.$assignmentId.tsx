import type { Route } from "./+types/_app.courses.$courseId_.balai.$assignmentId";
import { BalaiPage, CourseDetailPageSkeleton, studentApi, takeEarned, type WorkflowStage } from "~/features/lms";

const STAGES: WorkflowStage[] = [
  "1_independent_effort",
  "2_guided_questioning",
  "3_ai_evaluation",
  "4_revision_finalization",
  "5_reflection",
];

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.courseId || !params.assignmentId) throw new Response("Course tidak ditemukan", { status: 404 });
  const island = await studentApi.island(request, params.courseId);
  // ?nyala=<stage> after a stage was completed: that post lights up once.
  const nyala = new URL(request.url).searchParams.get("nyala") as WorkflowStage | null;
  const lit = nyala && STAGES.includes(nyala) ? { stage: nyala, awards: takeEarned(params.assignmentId) } : null;
  return { island, lit };
}

export function HydrateFallback() {
  return <CourseDetailPageSkeleton />;
}

export function meta() {
  return [{ title: "Balai | NALAR" }];
}

export default function BalaiRoute({ loaderData, params }: Route.ComponentProps) {
  return <BalaiPage data={loaderData.island} assignmentId={params.assignmentId} lit={loaderData.lit} />;
}

import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation } from "react-router";
import type { Route } from "./+types/_app.courses.$courseId_.balai.$assignmentId";
import { BalaiOverlay, BalaiPage, studentApi, takeEarned, useWorld3d, type WorkflowStage } from "~/features/lms";

const STAGES: WorkflowStage[] = [
  "1_independent_effort",
  "2_guided_questioning",
  "3_ai_evaluation",
  "4_revision_finalization",
  "5_reflection",
];

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.courseId || !params.assignmentId) throw new Response("Course tidak ditemukan", { status: 404 });
  // The course places the hall among the island's other buildings in 3D.
  const [island, course] = await Promise.all([
    studentApi.island(request, params.courseId),
    studentApi.course(request, params.courseId),
  ]);
  // ?nyala=<stage> after a stage was completed: that post lights up once.
  const nyala = new URL(request.url).searchParams.get("nyala") as WorkflowStage | null;
  const lit = nyala && STAGES.includes(nyala) ? { stage: nyala, awards: takeEarned(params.assignmentId) } : null;
  return { island, course, lit };
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export function meta() {
  return [{ title: "Balai | NALAR" }];
}

export default function BalaiRoute({ loaderData, params }: Route.ComponentProps) {
  return useWorld3d() ? (
    <BalaiOverlay island={loaderData.island} course={loaderData.course} assignmentId={params.assignmentId} lit={loaderData.lit} />
  ) : (
    <BalaiPage data={loaderData.island} assignmentId={params.assignmentId} lit={loaderData.lit} />
  );
}

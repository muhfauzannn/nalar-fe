import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation } from "react-router";
import { Navigate, useActionData, useSearchParams, type ShouldRevalidateFunctionArgs } from "react-router";

import type { Route } from "./+types/_app.courses.$courseId_.kelas";
import { ClassroomOverlay, LessonPage, QuizPage, AssignmentPage, useWorld3d } from "~/features/lms";

import { loadClassroom, actInClassroom } from "~/features/lms/api/classroom";
import { classroomFocus } from "~/features/lms/world3d/classroom-focus";
import { LessonLabs } from "~/features/lms/components/lesson-labs";

// All classroom stations share this route and canvas. Focus changes move the
// camera to the material board, lab bench, quiz board, or assignment book.
export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.courseId) throw new Response("Course tidak ditemukan", { status: 404 });
  return loadClassroom(request, params.courseId);
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  if (!params.courseId) throw new Response("Course tidak ditemukan", { status: 404 });
  return actInClassroom(request, params.courseId);
}

export function shouldRevalidate({ currentUrl, nextUrl, formMethod, formData, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  const intent = formData?.get("intent");
  if (intent === "save-answer" || intent === "delete-answer") return false;
  const sameData = ["materi", "lab", "kuis", "tugas"].every((key) => currentUrl.searchParams.get(key) === nextUrl.searchParams.get(key));
  const nextFocus = classroomFocus(nextUrl.searchParams);
  // Entering an activity reads its latest attempt/progress. Leaving it or
  // moving to the material board only changes the camera.
  if (!formMethod && currentUrl.pathname === nextUrl.pathname && sameData && (!nextFocus || nextFocus === "papan")) return false;
  return defaultShouldRevalidate;
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export function meta() {
  return [{ title: "Kelas | NALAR" }];
}

export default function ClassroomRoute({ loaderData, params }: Route.ComponentProps) {
  const world3d = useWorld3d();
  const [search] = useSearchParams();
  const focus = classroomFocus(search);
  const action = useActionData<typeof clientAction>();
  const actionProps = {
    actionError: action?.error,
    actionCode: action?.code,
    actionDraft: action && "draft" in action ? action.draft : undefined,
    actionStage: action && "stage" in action ? action.stage : undefined,
  };
  if (world3d) return <ClassroomOverlay {...loaderData} focus={focus} {...actionProps} />;
  if (focus === "lab") return <LessonLabs labs={loaderData.labLesson?.labs ?? []} />;
  if (focus === "kuis" && loaderData.quiz) return <QuizPage data={loaderData.quiz} {...actionProps} />;
  if (focus === "tugas" && loaderData.assignment) return <AssignmentPage data={loaderData.assignment} earned={loaderData.earned} {...actionProps} />;
  return loaderData.lesson ? <LessonPage data={loaderData.lesson} /> : <Navigate to={`/courses/${params.courseId}/daftar`} replace />;
}

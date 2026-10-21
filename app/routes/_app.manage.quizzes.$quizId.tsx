import type { Route } from "./+types/_app.manage.quizzes.$quizId";
import { ActivityPageSkeleton } from "~/features/lms";
import { manageApi, quizEditorAction, QuizEditorPage } from "~/features/authoring";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.quizId) throw new Response("Kuis tidak ditemukan", { status: 404 });
  return manageApi.quiz(request, params.quizId);
}

export async function clientAction(args: Route.ClientActionArgs) {
  return quizEditorAction(args);
}

export function HydrateFallback() {
  return <ActivityPageSkeleton />;
}

export function meta() {
  return [{ title: "Edit Kuis | NALAR" }];
}

export default function QuizEditorRoute({ loaderData }: Route.ComponentProps) {
  return <QuizEditorPage data={loaderData} />;
}

import {
  useActionData,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import type { Route } from "./+types/_app.quizzes.$quizId";
import {
  QuizPage,
  QuizPageSkeleton,
  studentApi,
} from "~/features/lms";
import { quizAction } from "~/features/lms/api/quiz-action";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.quizId) throw new Response("Quiz tidak ditemukan", { status: 404 });
  return studentApi.quiz(request, params.quizId);
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  return quizAction(request, params.quizId);
}

export function shouldRevalidate({
  formData,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  const intent = formData?.get("intent");
  if (intent === "save-answer" || intent === "delete-answer") return false;
  return defaultShouldRevalidate;
}

export function HydrateFallback() {
  return <QuizPageSkeleton />;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Quiz | NALAR" }];
}

export default function QuizRoute({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof clientAction>();
  return (
    <QuizPage
      data={loaderData}
      actionError={actionData?.error}
      actionCode={actionData?.code}
    />
  );
}

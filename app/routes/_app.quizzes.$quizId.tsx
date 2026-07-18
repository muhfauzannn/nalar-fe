import {
  redirect,
  useActionData,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import type { Route } from "./+types/_app.quizzes.$quizId";
import {
  ActivityPageSkeleton,
  QuizPage,
  studentApi,
  type QuizAnswerSubmission,
} from "~/features/lms";
import { HttpError } from "~/lib/http";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.quizId) throw new Response("Quiz tidak ditemukan", { status: 404 });
  return studentApi.quiz(request, params.quizId);
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  if (!params.quizId) throw new Response("Quiz tidak ditemukan", { status: 404 });
  const formData = await request.formData();
  const intent = formData.get("intent");
  try {
    if (intent === "start") {
      await studentApi.startQuiz(request, params.quizId);
    } else if (intent === "save-answer" || intent === "delete-answer") {
      const attemptId = formData.get("attemptId");
      const questionId = formData.get("questionId");
      if (typeof attemptId !== "string" || typeof questionId !== "string") {
        return {
          error: "Jawaban tidak dapat disimpan.",
          code: "QUIZ_ANSWER_INVALID" as const,
          questionId: null,
        };
      }

      if (intent === "delete-answer") {
        const result = await studentApi.deleteQuizAnswer(
          request,
          attemptId,
          questionId,
        );
        return { ...result, questionId };
      }

      const questionType = formData.get("questionType");
      const value = formData.get("answer");
      if (typeof value !== "string" || !value.trim()) {
        return {
          error: "Jawaban kosong tidak dapat disimpan.",
          code: "QUIZ_ANSWER_INVALID" as const,
          questionId,
        };
      }
      const answer: QuizAnswerSubmission =
        questionType === "multiple_choice"
          ? { questionId, selectedOptionId: value }
          : { questionId, textAnswer: value.trim() };
      const result = await studentApi.saveQuizAnswer(request, attemptId, answer);
      return { ...result, questionId };
    } else {
      const attemptId = formData.get("attemptId");
      const questionIds = formData
        .getAll("questionId")
        .filter((value): value is string => typeof value === "string");
      if (typeof attemptId !== "string") {
        return {
          error: "Attempt quiz tidak valid.",
          code: "QUIZ_ATTEMPT_NOT_FOUND" as const,
        };
      }
      const answers: QuizAnswerSubmission[] = [];
      for (const questionId of questionIds) {
        const questionType = formData.get(`questionType:${questionId}`);
        const value = formData.get(`answer:${questionId}`);
        if (questionType === "multiple_choice" && typeof value === "string" && value) {
          answers.push({ questionId, selectedOptionId: value });
          continue;
        }
        if (questionType === "short_answer" && typeof value === "string" && value.trim()) {
          answers.push({ questionId, textAnswer: value.trim() });
          continue;
        }
        return {
          error: "Jawab semua soal sebelum mengumpulkan quiz.",
          code: "QUIZ_ANSWERS_INCOMPLETE" as const,
        };
      }
      await studentApi.submitQuiz(request, attemptId, answers);
    }
    return redirect(`/quizzes/${params.quizId}`);
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof HttpError) {
      const questionId = formData.get("questionId");
      return {
        error: error.message,
        code: error.code,
        questionId: typeof questionId === "string" ? questionId : null,
      };
    }
    if (intent === "save-answer" || intent === "delete-answer") {
      const questionId = formData.get("questionId");
      return {
        error: "Koneksi terputus. Jawaban belum tersimpan.",
        code: undefined,
        questionId: typeof questionId === "string" ? questionId : null,
      };
    }
    if (error instanceof TypeError) {
      return {
        error: "Koneksi terputus. Perubahan belum diproses.",
        code: undefined,
      };
    }
    throw error;
  }
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
  return <ActivityPageSkeleton />;
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

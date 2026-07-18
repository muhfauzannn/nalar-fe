import { redirect } from "react-router";

import { forwardedRequestInit, http, HttpError } from "~/lib/http";
import type {
  AssignmentData,
  CourseData,
  CourseSummary,
  DashboardData,
  LessonData,
  QuizAnswerSubmission,
  QuizAnswerSaveResult,
  QuizData,
  StudentShellData,
  WorkflowStage,
} from "../types";

async function studentRequest<T>(request: Request, operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      const target = new URL(request.url);
      throw redirect(`/login?next=${encodeURIComponent(target.pathname + target.search)}`);
    }
    throw error;
  }
}

export const studentApi = {
  shell: (request: Request) =>
    studentRequest(request, () =>
      http.get<StudentShellData>("/api/student/me", forwardedRequestInit(request)),
    ),
  dashboard: (request: Request) =>
    studentRequest(request, () =>
      http.get<DashboardData>("/api/student/dashboard", forwardedRequestInit(request)),
    ),
  courses: (request: Request) =>
    studentRequest(request, () =>
      http.get<{ school: { id: string; name: string } | null; courses: CourseSummary[] }>(
        "/api/student/courses",
        forwardedRequestInit(request),
      ),
    ),
  course: (request: Request, courseId: string) =>
    studentRequest(request, () =>
      http.get<CourseData>(`/api/student/courses/${courseId}`, forwardedRequestInit(request)),
    ),
  lesson: (request: Request, lessonId: string) =>
    studentRequest(request, () =>
      http.get<LessonData>(`/api/student/lessons/${lessonId}`, forwardedRequestInit(request)),
    ),
  setLessonProgress: (
    request: Request,
    lessonId: string,
    status: "in_progress" | "completed",
  ) =>
    studentRequest(request, () =>
      http.patch(
        `/api/student/lessons/${lessonId}/progress`,
        { status },
        forwardedRequestInit(request),
      ),
    ),
  assignment: (request: Request, assignmentId: string) =>
    studentRequest(request, () =>
      http.get<AssignmentData>(
        `/api/student/assignments/${assignmentId}`,
        forwardedRequestInit(request),
      ),
    ),
  startAssignment: (request: Request, assignmentId: string) =>
    studentRequest(request, () =>
      http.post(
        `/api/student/assignments/${assignmentId}/submissions`,
        {},
        forwardedRequestInit(request),
      ),
    ),
  completeStage: (
    request: Request,
    submissionId: string,
    stage: WorkflowStage,
    content?: string,
  ) =>
    studentRequest(request, () =>
      http.post(
        `/api/student/submissions/${submissionId}/stages/${stage}/complete`,
        { content },
        forwardedRequestInit(request),
      ),
    ),
  quiz: (request: Request, quizId: string) =>
    studentRequest(request, () =>
      http.get<QuizData>(`/api/student/quizzes/${quizId}`, forwardedRequestInit(request)),
    ),
  startQuiz: (request: Request, quizId: string) =>
    studentRequest(request, () =>
      http.post(
        `/api/student/quizzes/${quizId}/attempts`,
        {},
        forwardedRequestInit(request),
      ),
    ),
  saveQuizAnswer: (
    request: Request,
    attemptId: string,
    answer: QuizAnswerSubmission,
  ) => {
    const { questionId, ...value } = answer;
    return studentRequest(request, () =>
      http.put<QuizAnswerSaveResult>(
        `/api/student/quiz-attempts/${attemptId}/answers/${questionId}`,
        value,
        forwardedRequestInit(request),
      ),
    );
  },
  deleteQuizAnswer: (
    request: Request,
    attemptId: string,
    questionId: string,
  ) =>
    studentRequest(request, () =>
      http.delete<QuizAnswerSaveResult>(
        `/api/student/quiz-attempts/${attemptId}/answers/${questionId}`,
        forwardedRequestInit(request),
      ),
    ),
  submitQuiz: (
    request: Request,
    attemptId: string,
    answers: QuizAnswerSubmission[],
  ) =>
    studentRequest(request, () =>
      http.post(
        `/api/student/quiz-attempts/${attemptId}/submit`,
        { answers },
        forwardedRequestInit(request),
      ),
    ),
};

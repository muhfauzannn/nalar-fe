import { redirect } from "react-router";

import { forwardedRequestInit, http, HttpError } from "~/lib/http";
import { forgetSignedIn } from "~/lib/session-hint";
import type {
  AssignmentData,
  CourseData,
  CourseSummary,
  DashboardData,
  EarnedPoint,
  IslandData,
  LessonData,
  PointsData,
  QuizAnswerSubmission,
  QuizAnswerSaveResult,
  QuizData,
  StudentShellData,
  WorldData,
  WorkflowStage,
} from "../types";

async function studentRequest<T>(request: Request, operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      forgetSignedIn();
      const target = new URL(request.url);
      throw redirect(`/login?next=${encodeURIComponent(target.pathname + target.search)}`);
    }
    throw error;
  }
}

// The data each student page reads, so it can be warmed before the click.
// Most pages read through `http.getRecent` (stale-while-revalidate). Quizzes and
// assignments never show stale data, since their attempt and stage state changes
// while the student works: only a prefetch made moments ago is reused (`fresh`).
const prefetchable: [RegExp, (id: string) => string[], "recent" | "fresh"][] = [
  [/^\/dashboard$/, () => ["/api/student/dashboard", "/api/student/points"], "recent"],
  [/^\/dunia$/, () => ["/api/student/world"], "recent"],
  [/^\/lencana$/, () => ["/api/student/points"], "recent"],
  [/^\/courses$/, () => ["/api/student/courses"], "recent"],
  // An island, its classroom and its halls read the same two.
  [/^\/courses\/(?!join$)([^/]+)(?:\/kelas|\/balai\/[^/]+)?$/, (id) => [`/api/student/courses/${id}`, `/api/student/courses/${id}/island`], "recent"],
  [/^\/lessons\/([^/]+)$/, (id) => [`/api/student/lessons/${id}`], "recent"],
  [/^\/assignments\/([^/]+)$/, (id) => [`/api/student/assignments/${id}`], "fresh"],
  [/^\/quizzes\/([^/]+)$/, (id) => [`/api/student/quizzes/${id}`], "fresh"],
];

/** Warms the data of a student page the user is about to open (hover, focus, touch, idle). */
export function prefetchStudentPage(pathname: string) {
  for (const [pattern, apiPath, kind] of prefetchable) {
    const match = pattern.exec(pathname);
    if (match) {
      for (const path of apiPath(match[1] ?? "")) {
        if (kind === "fresh") http.prefetch(path);
        else http.getRecent(path).catch(() => {});
      }
      return;
    }
  }
}

export const studentApi = {
  shell: (request: Request) =>
    studentRequest(request, () =>
      http.get<StudentShellData>("/api/student/me", forwardedRequestInit(request)),
    ),
  island: (request: Request, courseId: string) =>
    studentRequest(request, () =>
      http.getRecent<IslandData>(`/api/student/courses/${courseId}/island`, forwardedRequestInit(request)),
    ),
  world: (request: Request) =>
    studentRequest(request, () =>
      http.getRecent<WorldData>("/api/student/world", forwardedRequestInit(request)),
    ),
  points: (request: Request) =>
    studentRequest(request, () =>
      http.getRecent<PointsData>("/api/student/points", forwardedRequestInit(request)),
    ),
  dashboard: (request: Request) =>
    studentRequest(request, () =>
      http.getRecent<DashboardData>("/api/student/dashboard", forwardedRequestInit(request)),
    ),
  courses: (request: Request) =>
    studentRequest(request, () =>
      http.getRecent<{ courses: CourseSummary[] }>(
        "/api/student/courses",
        forwardedRequestInit(request),
      ),
    ),
  course: (request: Request, courseId: string) =>
    studentRequest(request, () =>
      http.getRecent<CourseData>(`/api/student/courses/${courseId}`, forwardedRequestInit(request)),
    ),
  lesson: (request: Request, lessonId: string) =>
    studentRequest(request, () =>
      http.getRecent<LessonData>(`/api/student/lessons/${lessonId}`, forwardedRequestInit(request)),
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
      http.getPrefetched<AssignmentData>(
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
    signals?: unknown,
  ) =>
    studentRequest(request, () =>
      http.post<{ currentStage: WorkflowStage | null; submitted: boolean; points?: EarnedPoint[] }>(
        `/api/student/submissions/${submissionId}/stages/${stage}/complete`,
        { content, signals },
        forwardedRequestInit(request),
      ),
    ),
  analyzeSubmission: (request: Request, submissionId: string) =>
    studentRequest(request, () =>
      http.post(
        `/api/student/submissions/${submissionId}/offloading`,
        {},
        forwardedRequestInit(request),
      ),
    ),
  quiz: (request: Request, quizId: string) =>
    studentRequest(request, () =>
      http.getPrefetched<QuizData>(`/api/student/quizzes/${quizId}`, forwardedRequestInit(request)),
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
  analyzeQuizReflection: (request: Request, attemptId: string) =>
    studentRequest(request, () =>
      http.post(
        `/api/student/quiz-attempts/${attemptId}/reflection`,
        {},
        forwardedRequestInit(request),
      ),
    ),
};

import { redirect } from "react-router";

import { forwardedRequestInit, http, HttpError } from "~/lib/http";
import type {
  ActionResult,
  AssignmentEditorData,
  CourseEditorData,
  LessonEditorData,
  ManagedCourseSummary,
  PublicationStatus,
  QuestionDraft,
  QuizEditorData,
  ResourceType,
  Scenario,
  Subject,
  WorkStatus,
} from "../types";

// Same convention as the student API: a 401 sends the user to /login. For page
// loads a 404 becomes a real 404 page; for writes it stays a message on the form.
async function guarded<T>(
  request: Request,
  operation: () => Promise<T>,
  notFoundIsPage: boolean,
) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      const target = new URL(request.url);
      throw redirect(`/login?next=${encodeURIComponent(target.pathname + target.search)}`);
    }
    if (notFoundIsPage && error instanceof HttpError && error.status === 404) {
      throw new Response(error.message, { status: 404 });
    }
    throw error;
  }
}

const load = <T>(request: Request, operation: () => Promise<T>) =>
  guarded(request, operation, true);
const write = <T>(request: Request, operation: () => Promise<T>) =>
  guarded(request, operation, false);

// Turns an error from a mutation into something the page can show. Redirects
// and thrown Responses (a real 404 page) are not ours to swallow.
export function failure(error: unknown): ActionResult {
  if (error instanceof Response) throw error;
  if (error instanceof HttpError) {
    return { ok: false, error: error.message, code: error.code };
  }
  if (error instanceof TypeError) {
    return { ok: false, error: "Koneksi terputus. Perubahanmu belum tersimpan." };
  }
  throw error;
}

export async function runAction(
  operation: () => Promise<unknown>,
  message?: string,
): Promise<ActionResult> {
  try {
    await operation();
    return { ok: true, message };
  } catch (error) {
    return failure(error);
  }
}

const init = forwardedRequestInit;
const base = "/api/manage";

type ResourceBody = { type: ResourceType; title: string; content?: string; url?: string };
type Schedule = {
  availableAt?: string | null;
  dueAt?: string | null;
  closesAt?: string | null;
};

export const manageApi = {
  subjects: (request: Request) =>
    load(request, () => http.get<{ subjects: Subject[] }>(`${base}/subjects`, init(request))),
  scenarios: (request: Request) =>
    load(request, () => http.get<{ scenarios: Scenario[] }>(`${base}/scenarios`, init(request))),

  // ---- courses
  courses: (request: Request) =>
    load(request, () =>
      http.get<{ courses: ManagedCourseSummary[] }>(`${base}/courses`, init(request)),
    ),
  course: (request: Request, courseId: string) =>
    load(request, () => http.get<CourseEditorData>(`${base}/courses/${courseId}`, init(request))),
  createCourse: (
    request: Request,
    body: { name: string; description: string; subjectId: string },
  ) => write(request, () => http.post<{ id: string }>(`${base}/courses`, body, init(request))),
  updateCourse: (
    request: Request,
    courseId: string,
    body: {
      name?: string;
      description?: string;
      subjectId?: string;
      status?: PublicationStatus;
    },
  ) => write(request, () => http.patch(`${base}/courses/${courseId}`, body, init(request))),
  resetJoinCode: (request: Request, courseId: string) =>
    write(request, () =>
      http.post<{ joinCode: string }>(`${base}/courses/${courseId}/join-code`, {}, init(request)),
    ),
  disableJoinCode: (request: Request, courseId: string) =>
    write(request, () => http.delete(`${base}/courses/${courseId}/join-code`, init(request))),

  // ---- modules / lessons / resources
  createModule: (
    request: Request,
    courseId: string,
    body: { title: string; description?: string; status: PublicationStatus },
  ) => write(request, () => http.post(`${base}/courses/${courseId}/modules`, body, init(request))),
  updateModule: (
    request: Request,
    moduleId: string,
    body: { title?: string; description?: string; status?: PublicationStatus },
  ) => write(request, () => http.patch(`${base}/modules/${moduleId}`, body, init(request))),
  orderModules: (request: Request, courseId: string, ids: string[]) =>
    write(request, () =>
      http.put(`${base}/courses/${courseId}/modules/order`, { ids }, init(request)),
    ),
  createLesson: (
    request: Request,
    moduleId: string,
    body: { title: string; content?: string; status: PublicationStatus },
  ) => write(request, () => http.post(`${base}/modules/${moduleId}/lessons`, body, init(request))),
  lesson: (request: Request, lessonId: string) =>
    load(request, () => http.get<LessonEditorData>(`${base}/lessons/${lessonId}`, init(request))),
  updateLesson: (
    request: Request,
    lessonId: string,
    body: { title?: string; content?: string; status?: PublicationStatus },
  ) => write(request, () => http.patch(`${base}/lessons/${lessonId}`, body, init(request))),
  orderLessons: (request: Request, moduleId: string, ids: string[]) =>
    write(request, () =>
      http.put(`${base}/modules/${moduleId}/lessons/order`, { ids }, init(request)),
    ),
  createResource: (request: Request, lessonId: string, body: ResourceBody) =>
    write(request, () => http.post(`${base}/lessons/${lessonId}/resources`, body, init(request))),
  updateResource: (request: Request, resourceId: string, body: ResourceBody) =>
    write(request, () => http.patch(`${base}/resources/${resourceId}`, body, init(request))),
  uploadResource: (request: Request, lessonId: string, form: FormData) =>
    write(request, () =>
      http.postForm(`${base}/lessons/${lessonId}/resources/upload`, form, init(request)),
    ),
  replaceResourceFile: (request: Request, resourceId: string, form: FormData) =>
    write(request, () =>
      http.putForm(`${base}/resources/${resourceId}/file`, form, init(request)),
    ),
  deleteResource: (request: Request, resourceId: string) =>
    write(request, () => http.delete(`${base}/resources/${resourceId}`, init(request))),
  orderResources: (request: Request, lessonId: string, ids: string[]) =>
    write(request, () =>
      http.put(`${base}/lessons/${lessonId}/resources/order`, { ids }, init(request)),
    ),

  // ---- quizzes
  createQuiz: (
    request: Request,
    courseId: string,
    body: { title: string; timeLimitMinutes?: number | null },
  ) =>
    write(request, () =>
      http.post<{ id: string }>(`${base}/courses/${courseId}/quizzes`, body, init(request)),
    ),
  quiz: (request: Request, quizId: string) =>
    load(request, () => http.get<QuizEditorData>(`${base}/quizzes/${quizId}`, init(request))),
  updateQuiz: (
    request: Request,
    quizId: string,
    body: Schedule & {
      title?: string;
      instructions?: string;
      moduleId?: string | null;
      timeLimitMinutes?: number | null;
      status?: WorkStatus;
    },
  ) => write(request, () => http.patch(`${base}/quizzes/${quizId}`, body, init(request))),
  duplicateQuiz: (request: Request, quizId: string) =>
    write(request, () =>
      http.post<{ id: string }>(`${base}/quizzes/${quizId}/duplicate`, {}, init(request)),
    ),
  createQuestion: (request: Request, quizId: string, body: QuestionDraft) =>
    write(request, () => http.post(`${base}/quizzes/${quizId}/questions`, body, init(request))),
  updateQuestion: (request: Request, questionId: string, body: QuestionDraft) =>
    write(request, () => http.put(`${base}/questions/${questionId}`, body, init(request))),
  deleteQuestion: (request: Request, questionId: string) =>
    write(request, () => http.delete(`${base}/questions/${questionId}`, init(request))),
  orderQuestions: (request: Request, quizId: string, ids: string[]) =>
    write(request, () =>
      http.put(`${base}/quizzes/${quizId}/questions/order`, { ids }, init(request)),
    ),

  // ---- assignments
  createAssignment: (
    request: Request,
    courseId: string,
    body: { scenarioId: string; title?: string },
  ) =>
    write(request, () =>
      http.post<{ id: string }>(`${base}/courses/${courseId}/assignments`, body, init(request)),
    ),
  assignment: (request: Request, assignmentId: string) =>
    load(request, () =>
      http.get<AssignmentEditorData>(`${base}/assignments/${assignmentId}`, init(request)),
    ),
  updateAssignment: (
    request: Request,
    assignmentId: string,
    body: Schedule & {
      title?: string;
      instructions?: string;
      moduleId?: string | null;
      status?: WorkStatus;
    },
  ) =>
    write(request, () => http.patch(`${base}/assignments/${assignmentId}`, body, init(request))),
  duplicateAssignment: (request: Request, assignmentId: string) =>
    write(request, () =>
      http.post<{ id: string }>(`${base}/assignments/${assignmentId}/duplicate`, {}, init(request)),
    ),
  setCriteria: (
    request: Request,
    assignmentId: string,
    criteria: Array<{ label: string; description: string; maxPoints: number }>,
  ) =>
    write(request, () =>
      http.put(`${base}/assignments/${assignmentId}/criteria`, { criteria }, init(request)),
    ),
};

export const enrollmentApi = {
  join: (request: Request, code: string) =>
    write(request, () =>
      http.post<{ course: { id: string; name: string }; alreadyJoined: boolean }>(
        "/api/courses/join",
        { code },
        init(request),
      ),
    ),
};

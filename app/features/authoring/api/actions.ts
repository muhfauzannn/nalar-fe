import { redirect } from "react-router";

import {
  flag,
  jsonField,
  localToIso,
  rawText,
  text,
} from "../lib/form";
import type { ActionResult, PublicationStatus, QuestionDraft, WorkStatus } from "../types";
import { enrollmentApi, failure, manageApi, runAction } from "./manage";

type Args = { request: Request; params: { [key: string]: string | undefined } };

const PUBLICATION: PublicationStatus[] = ["draft", "published", "archived"];
const WORK: WorkStatus[] = ["draft", "published", "closed", "archived"];

const unknownIntent: ActionResult = {
  ok: false,
  error: "Aksi tidak dikenali. Muat ulang halaman lalu coba lagi.",
};

function required(value: string | undefined, name: string): string {
  if (!value) throw new Response(`${name} tidak ditemukan`, { status: 404 });
  return value;
}

function publicationStatus(form: FormData, name = "status"): PublicationStatus {
  const value = text(form, name);
  return (PUBLICATION as string[]).includes(value) ? (value as PublicationStatus) : "draft";
}

function workStatus(form: FormData, name = "status"): WorkStatus {
  const value = text(form, name);
  return (WORK as string[]).includes(value) ? (value as WorkStatus) : "draft";
}

function ids(form: FormData): string[] {
  const parsed = jsonField<unknown>(form, "ids");
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
}

function minutes(form: FormData, name: string): number | null {
  const value = text(form, name);
  return value === "" ? null : Number(value);
}

function schedule(form: FormData) {
  return {
    availableAt: localToIso(text(form, "availableAt")),
    dueAt: localToIso(text(form, "dueAt")),
    closesAt: localToIso(text(form, "closesAt")),
  };
}

function resourceBody(form: FormData) {
  const type = text(form, "type") as "text" | "link" | "file";
  const content = rawText(form, "content").trim();
  return {
    type,
    title: text(form, "title"),
    ...(content ? { content } : {}),
    ...(type === "text" ? {} : { url: text(form, "url") }),
  };
}

// ---- /manage/courses/new ------------------------------------------------

export async function newCourseAction({ request }: Args) {
  const form = await request.formData();
  try {
    const created = await manageApi.createCourse(request, {
      name: text(form, "name"),
      description: text(form, "description"),
      subjectId: text(form, "subjectId"),
    });
    return redirect(`/manage/courses/${created.id}`);
  } catch (error) {
    return failure(error);
  }
}

// ---- /courses/join ------------------------------------------------------

export async function joinCourseAction({ request }: Args) {
  const form = await request.formData();
  try {
    const joined = await enrollmentApi.join(request, text(form, "code"));
    return redirect(`/courses/${joined.course.id}`);
  } catch (error) {
    return failure(error);
  }
}

// ---- /manage/courses/:courseId -----------------------------------------

export async function courseEditorAction({ request, params }: Args) {
  const courseId = required(params.courseId, "Course");
  const form = await request.formData();

  switch (text(form, "intent")) {
    case "course-update":
      return runAction(() =>
        manageApi.updateCourse(request, courseId, {
          name: text(form, "name"),
          description: text(form, "description"),
          subjectId: text(form, "subjectId"),
        }),
      );
    case "course-status":
      return runAction(() =>
        manageApi.updateCourse(request, courseId, { status: publicationStatus(form) }),
      );
    case "join-code-reset":
      return runAction(() => manageApi.resetJoinCode(request, courseId));
    case "join-code-disable":
      return runAction(() => manageApi.disableJoinCode(request, courseId));

    case "module-create":
      return runAction(() =>
        manageApi.createModule(request, courseId, {
          title: text(form, "title"),
          description: text(form, "description"),
          status: flag(form, "publish") ? "published" : "draft",
        }),
      );
    case "module-update":
      return runAction(() =>
        manageApi.updateModule(request, text(form, "moduleId"), {
          title: text(form, "title"),
          description: text(form, "description"),
        }),
      );
    case "module-status":
      return runAction(() =>
        manageApi.updateModule(request, text(form, "moduleId"), { status: publicationStatus(form) }),
      );
    case "module-order":
      return runAction(() => manageApi.orderModules(request, courseId, ids(form)));

    case "lesson-create":
      return runAction(() =>
        manageApi.createLesson(request, text(form, "moduleId"), {
          title: text(form, "title"),
          status: flag(form, "publish") ? "published" : "draft",
        }),
      );
    case "lesson-status":
      return runAction(() =>
        manageApi.updateLesson(request, text(form, "lessonId"), { status: publicationStatus(form) }),
      );
    case "lesson-order":
      return runAction(() => manageApi.orderLessons(request, text(form, "moduleId"), ids(form)));

    case "quiz-create": {
      try {
        const limit = minutes(form, "timeLimitMinutes");
        const created = await manageApi.createQuiz(request, courseId, {
          title: text(form, "title"),
          ...(limit === null ? {} : { timeLimitMinutes: limit }),
        });
        return redirect(`/manage/quizzes/${created.id}`);
      } catch (error) {
        return failure(error);
      }
    }
    case "assignment-create": {
      try {
        const title = text(form, "title");
        const created = await manageApi.createAssignment(request, courseId, {
          scenarioId: text(form, "scenarioId"),
          ...(title ? { title } : {}),
        });
        return redirect(`/manage/assignments/${created.id}`);
      } catch (error) {
        return failure(error);
      }
    }
    default:
      return unknownIntent;
  }
}

// ---- /manage/lessons/:lessonId -----------------------------------------

export async function lessonEditorAction({ request, params }: Args) {
  const lessonId = required(params.lessonId, "Lesson");
  const form = await request.formData();

  switch (text(form, "intent")) {
    case "lesson-update":
      return runAction(() =>
        manageApi.updateLesson(request, lessonId, {
          title: text(form, "title"),
          content: rawText(form, "content"),
          status: publicationStatus(form),
        }),
      );
    case "resource-create":
      return runAction(() => manageApi.createResource(request, lessonId, resourceBody(form)));
    case "resource-update":
      return runAction(() =>
        manageApi.updateResource(request, text(form, "resourceId"), resourceBody(form)),
      );
    case "resource-delete":
      return runAction(() => manageApi.deleteResource(request, text(form, "resourceId")));
    case "resource-order":
      return runAction(() => manageApi.orderResources(request, lessonId, ids(form)));
    default:
      return unknownIntent;
  }
}

// ---- /manage/quizzes/:quizId -------------------------------------------

export async function quizEditorAction({ request, params }: Args) {
  const quizId = required(params.quizId, "Kuis");
  const form = await request.formData();

  switch (text(form, "intent")) {
    case "quiz-update":
      return runAction(() =>
        manageApi.updateQuiz(request, quizId, {
          title: text(form, "title"),
          instructions: text(form, "instructions"),
          // A locked time-limit input is disabled, hence absent from the form.
          ...(form.has("timeLimitMinutes")
            ? { timeLimitMinutes: minutes(form, "timeLimitMinutes") }
            : {}),
          ...schedule(form),
        }),
      );
    case "quiz-status":
      return runAction(() => manageApi.updateQuiz(request, quizId, { status: workStatus(form) }));
    case "quiz-duplicate": {
      try {
        const copy = await manageApi.duplicateQuiz(request, quizId);
        return redirect(`/manage/quizzes/${copy.id}`);
      } catch (error) {
        return failure(error);
      }
    }
    case "question-create": {
      const draft = jsonField<QuestionDraft>(form, "payload");
      if (!draft) return unknownIntent;
      return runAction(() => manageApi.createQuestion(request, quizId, draft));
    }
    case "question-update": {
      const draft = jsonField<QuestionDraft>(form, "payload");
      if (!draft) return unknownIntent;
      return runAction(() => manageApi.updateQuestion(request, text(form, "questionId"), draft));
    }
    case "question-delete":
      return runAction(() => manageApi.deleteQuestion(request, text(form, "questionId")));
    case "question-order":
      return runAction(() => manageApi.orderQuestions(request, quizId, ids(form)));
    default:
      return unknownIntent;
  }
}

// ---- /manage/assignments/:assignmentId ---------------------------------

export async function assignmentEditorAction({ request, params }: Args) {
  const assignmentId = required(params.assignmentId, "Assignment");
  const form = await request.formData();

  switch (text(form, "intent")) {
    case "assignment-update":
      return runAction(() =>
        manageApi.updateAssignment(request, assignmentId, {
          title: text(form, "title"),
          // Disabled (locked) fields are absent from the form.
          ...(form.has("instructions") ? { instructions: rawText(form, "instructions").trim() } : {}),
          ...schedule(form),
        }),
      );
    case "assignment-status":
      return runAction(() =>
        manageApi.updateAssignment(request, assignmentId, { status: workStatus(form) }),
      );
    case "assignment-duplicate": {
      try {
        const copy = await manageApi.duplicateAssignment(request, assignmentId);
        return redirect(`/manage/assignments/${copy.id}`);
      } catch (error) {
        return failure(error);
      }
    }
    case "criteria-save": {
      const criteria = jsonField<Array<{ label: string; description: string; maxPoints: number }>>(
        form,
        "payload",
      );
      if (!criteria) return unknownIntent;
      return runAction(() => manageApi.setCriteria(request, assignmentId, criteria));
    }
    default:
      return unknownIntent;
  }
}

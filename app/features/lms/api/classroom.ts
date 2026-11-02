import { redirect } from "react-router";
import { HttpError } from "~/lib/http";
import { studentApi } from "./student";
import { assignmentAction } from "./assignment-action";
import { quizAction } from "./quiz-action";
import { takeEarned } from "../lib/game";
import { classroomFocus } from "../world3d/classroom-focus";
import type { CourseData } from "../types";

export async function loadClassroom(request: Request, courseId: string) {
  const search = new URL(request.url).searchParams;
  const focus = classroomFocus(search);
  const [course, island] = await Promise.all([
    studentApi.course(request, courseId),
    studentApi.island(request, courseId),
  ]);
  const lessons = course.modules
    .slice()
    .sort((a, b) => a.position - b.position)
    .flatMap((module) => module.lessons);
  const asked = search.get("materi");
  if (asked && !lessons.some((lesson) => lesson.id === asked))
    throw new Response("Materi tidak ditemukan di kelas ini", { status: 404 });
  const chosen =
    lessons.find((lesson) => lesson.id === asked) ??
    lessons.find((lesson) => lesson.status !== "completed") ??
    lessons[0];
  const labId = search.get("lab") ?? island.labs[0]?.id;
  const lab =
    focus === "lab" ? island.labs.find((lab) => lab.id === labId) : null;
  const quizId = search.get("kuis") ?? course.quizzes[0]?.id;
  const assignmentId =
    search.get("tugas") ??
    course.assignments.find(
      (assignment) =>
        assignment.submissionStatus !== "submitted" &&
        assignment.submissionStatus !== "returned",
    )?.id ??
    course.assignments[0]?.id;
  if (focus === "lab" && labId && !lab)
    throw new Response("Lab tidak ditemukan di kelas ini", { status: 404 });
  if (
    focus === "kuis" &&
    quizId &&
    !course.quizzes.some((quiz) => quiz.id === quizId)
  )
    throw new Response("Kuis tidak ditemukan di kelas ini", { status: 404 });
  if (
    focus === "tugas" &&
    assignmentId &&
    !course.assignments.some((assignment) => assignment.id === assignmentId)
  )
    throw new Response("Tugas tidak ditemukan di kelas ini", { status: 404 });
  const selection: [string, string | undefined] | null =
    focus === "lab"
      ? ["lab", labId]
      : focus === "kuis"
        ? ["kuis", quizId]
        : focus === "tugas"
          ? ["tugas", assignmentId]
          : null;
  if (selection?.[1] && !search.has(selection[0])) {
    search.set(selection[0], selection[1]);
    throw redirect(new URL(request.url).pathname + `?${search}`);
  }
  const lessonRead = chosen
    ? studentApi.lesson(request, chosen.id)
    : Promise.resolve(null);
  const [lesson, labLesson, quiz, assignment] = await Promise.all([
    lessonRead,
    lab
      ? lab.lessonId === chosen?.id
        ? lessonRead
        : studentApi.lesson(request, lab.lessonId)
      : null,
    focus === "kuis" && quizId ? studentApi.quiz(request, quizId) : null,
    focus === "tugas" && assignmentId
      ? studentApi.assignment(request, assignmentId)
      : null,
  ]);
  return {
    course,
    island,
    lesson,
    labLesson,
    quiz,
    assignment,
    earned: assignment ? takeEarned(assignment.id) : [],
  };
}

export async function actInClassroom(request: Request, courseId: string) {
  const url = new URL(request.url);
  const focus = classroomFocus(url.searchParams);
  const returnTo = url.pathname + url.search;
  // Resolve the activity from this course, never from an unverified form ID.
  let course: CourseData;
  try {
    course = await studentApi.course(request, courseId);
  } catch (error) {
    if (!(error instanceof HttpError) && !(error instanceof TypeError))
      throw error;
    // A connectivity failure during action validation belongs to the form,
    // including its autosave acknowledgement, rather than the root boundary.
    const fields = await request.formData();
    const questionId = fields.get("questionId");
    const draft = fields.get("content");
    const stage = fields.get("stage");
    return {
      error:
        error instanceof HttpError
          ? error.message
          : "Koneksi terputus. Perubahan belum diproses.",
      code: error instanceof HttpError ? error.code : undefined,
      questionId: typeof questionId === "string" ? questionId : null,
      draft: typeof draft === "string" ? draft : undefined,
      stage: typeof stage === "string" ? stage : undefined,
    };
  }
  if (focus === "kuis") {
    const quizId = url.searchParams.get("kuis") ?? course.quizzes[0]?.id;
    if (!quizId || !course.quizzes.some((quiz) => quiz.id === quizId))
      throw new Response("Kuis tidak ditemukan", { status: 404 });
    return quizAction(request, quizId, returnTo);
  }
  if (focus === "tugas") {
    const assignmentId =
      url.searchParams.get("tugas") ??
      course.assignments.find(
        (assignment) =>
          assignment.submissionStatus !== "submitted" &&
          assignment.submissionStatus !== "returned",
      )?.id ??
      course.assignments[0]?.id;
    if (
      !assignmentId ||
      !course.assignments.some((assignment) => assignment.id === assignmentId)
    )
      throw new Response("Tugas tidak ditemukan", { status: 404 });
    return assignmentAction(request, assignmentId, returnTo);
  }
  throw new Response("Stasiun ini tidak menerima form", { status: 400 });
}

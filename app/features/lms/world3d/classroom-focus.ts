export type ClassroomFocus = "papan" | "lab" | "kuis" | "tugas";
export type Surface = {
  center: [number, number, number];
  width: number;
  height: number;
  tilt: number;
};

export function classroomFocus(search: URLSearchParams): ClassroomFocus | null {
  const focus = search.get("fokus");
  return focus === "papan" ||
    focus === "lab" ||
    focus === "kuis" ||
    focus === "tugas"
    ? focus
    : null;
}

export function classroomUrl(
  courseId: string,
  options: {
    lessonId?: string | null;
    focus?: ClassroomFocus | null;
    labId?: string | null;
    quizId?: string | null;
    assignmentId?: string | null;
  } = {},
) {
  const search = new URLSearchParams();
  if (options.lessonId) search.set("materi", options.lessonId);
  if (options.focus) search.set("fokus", options.focus);
  if (options.labId) search.set("lab", options.labId);
  if (options.quizId) search.set("kuis", options.quizId);
  if (options.assignmentId) search.set("tugas", options.assignmentId);
  return `/courses/${encodeURIComponent(courseId)}/kelas${search.size ? `?${search}` : ""}`;
}

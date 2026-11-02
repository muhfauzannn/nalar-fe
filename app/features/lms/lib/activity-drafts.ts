// Keep unfinished writing when the student steps back into the classroom.
// Submission/attempt IDs keep drafts separate between activities and accounts.
export const assignmentDraftKey = (submissionId: string, stage: string) =>
  `assignment:${submissionId}:${stage}`;
export const quizDraftKey = (attemptId: string, questionId: string) =>
  `quiz:${attemptId}:${questionId}`;

export function readActivityDraft(key: string) {
  try {
    return sessionStorage.getItem(`nalar:draft:${key}`) ?? undefined;
  } catch {
    return undefined;
  }
}
export function writeActivityDraft(key: string, value: string) {
  try {
    sessionStorage.setItem(`nalar:draft:${key}`, value);
  } catch {
    /* The current form still holds the writing. */
  }
}
export function clearActivityDraft(key: string) {
  try {
    sessionStorage.removeItem(`nalar:draft:${key}`);
  } catch {
    /* Storage may be unavailable. */
  }
}

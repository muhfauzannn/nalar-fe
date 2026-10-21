/**
 * Public API of the `authoring` feature: creating and managing courses (modules,
 * lessons, resources, quizzes, assignments) and joining a course by class code.
 * Routes import from this barrel only.
 */
export {
  assignmentEditorAction,
  courseEditorAction,
  joinCourseAction,
  lessonEditorAction,
  newCourseAction,
  quizEditorAction,
} from "./api/actions";
export { manageApi } from "./api/manage";
export { AssignmentEditorPage } from "./pages/assignment-editor-page";
export { CourseEditorPage } from "./pages/course-editor-page";
export { JoinCoursePage } from "./pages/join-course-page";
export { LessonEditorPage } from "./pages/lesson-editor-page";
export { MyCoursesPage } from "./pages/my-courses-page";
export { NewCoursePage } from "./pages/new-course-page";
export { QuizEditorPage } from "./pages/quiz-editor-page";
export type * from "./types";

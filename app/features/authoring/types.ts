// Shapes returned by `/api/manage/*` and `/api/courses/join`.

export type PublicationStatus = "draft" | "published" | "archived";
export type WorkStatus = "draft" | "published" | "closed" | "archived";
export type ResourceType = "text" | "link" | "file";

export type Subject = { id: string; code: string; name: string };

export type Scenario = {
  id: string;
  title: string;
  instructions: string;
  subjectName: string;
  criteria: Array<{ label: string; description: string; maxPoints: number }>;
};

export type ManagedCourseSummary = {
  id: string;
  name: string;
  description: string | null;
  status: PublicationStatus;
  subjectName: string;
  joinCode: string | null;
  studentCount: number;
  quizCount: number;
  assignmentCount: number;
};

export type ManagedResource = {
  id: string;
  type: ResourceType;
  title: string;
  content: string | null;
  url: string | null;
  position: number;
};

export type ManagedLessonSummary = {
  id: string;
  moduleId: string;
  title: string;
  content: string | null;
  position: number;
  status: PublicationStatus;
  resources: ManagedResource[];
};

export type ManagedModule = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  status: PublicationStatus;
  lessons: ManagedLessonSummary[];
};

export type ManagedQuizSummary = {
  id: string;
  title: string;
  status: WorkStatus;
  moduleId: string | null;
  dueAt: string | null;
  closesAt: string | null;
  questionCount: number;
  attemptCount: number;
};

export type ManagedAssignmentSummary = {
  id: string;
  title: string;
  status: WorkStatus;
  moduleId: string | null;
  scenarioTitle: string;
  dueAt: string | null;
  closesAt: string | null;
  submissionCount: number;
};

export type CourseEditorData = {
  course: {
    id: string;
    name: string;
    description: string | null;
    status: PublicationStatus;
    subjectId: string;
    subjectName: string;
    joinCode: string | null;
  };
  studentCount: number;
  modules: ManagedModule[];
  quizzes: ManagedQuizSummary[];
  assignments: ManagedAssignmentSummary[];
};

export type LessonEditorData = {
  lesson: {
    id: string;
    title: string;
    content: string | null;
    status: PublicationStatus;
    moduleId: string;
    moduleTitle: string;
    courseId: string;
    courseName: string;
  };
  resources: ManagedResource[];
};

export type ManagedQuestion = {
  id: string;
  type: "multiple_choice" | "short_answer";
  prompt: string;
  explanation: string | null;
  acceptedAnswers: string[] | null;
  points: number;
  position: number;
  options: Array<{ id: string; label: string; isCorrect: boolean; position: number }>;
};

export type QuizEditorData = {
  quiz: {
    id: string;
    courseId: string;
    moduleId: string | null;
    title: string;
    instructions: string | null;
    status: WorkStatus;
    availableAt: string | null;
    dueAt: string | null;
    closesAt: string | null;
    timeLimitMinutes: number | null;
  };
  questions: ManagedQuestion[];
  attemptCount: number;
  locked: boolean;
  editable: boolean;
  readiness: {
    ready: boolean;
    questionCount: number;
    problems: Array<{ questionId: string; message: string }>;
  };
};

export type ManagedCriterion = {
  id: string;
  label: string;
  description: string;
  maxPoints: number;
  position: number;
};

export type AssignmentEditorData = {
  assignment: {
    id: string;
    courseId: string;
    moduleId: string | null;
    title: string;
    instructions: string;
    status: WorkStatus;
    availableAt: string | null;
    dueAt: string | null;
    closesAt: string | null;
    scenarioId: string;
    scenarioTitle: string;
    subjectName: string;
  };
  criteria: ManagedCriterion[];
  submissionCount: number;
  locked: boolean;
  editable: boolean;
  readiness: { ready: boolean; problems: string[] };
};

export type QuestionDraft =
  | {
      type: "multiple_choice";
      prompt: string;
      explanation: string;
      points: number;
      options: Array<{ label: string; isCorrect: boolean }>;
    }
  | {
      type: "short_answer";
      prompt: string;
      explanation: string;
      points: number;
      acceptedAnswers: string[];
    };

// What every clientAction in this feature returns to its page.
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; code?: string };

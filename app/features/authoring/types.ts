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
  /** An uploaded PDF. Present instead of `url`, never together with it. */
  file: { name: string; size: number } | null;
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
  labs: Array<{ id: string; labKey: string }>;
  labCatalog: Array<{ key: string; title: string; subject: string }>;
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

// ---- teacher analytics (AI Offloading Index, read-only) ----------------

export type OffloadingLevel =
  | "1_ai_as_tool"
  | "2_ai_as_scaffold"
  | "3_partial_offloading"
  | "4_full_offloading";
export type WorkflowStage =
  | "1_independent_effort"
  | "2_guided_questioning"
  | "3_ai_evaluation"
  | "4_revision_finalization"
  | "5_reflection";
export type PromptIntent = "direct_answer" | "explanation_hint" | "reflective_evaluative";

export type AssignmentAnalytics = {
  assignment: {
    id: string;
    title: string;
    status: WorkStatus;
    dueAt: string | null;
    courseId: string;
    courseName: string;
  };
  counts: { enrolled: number; notStarted: number; inProgress: number; submitted: number; analyzed: number };
  distribution: Array<{ level: OffloadingLevel; count: number }>;
  commonFactors: Array<{ factor: string; students: number; averageContribution: number; example: string }>;
  students: Array<{
    membershipId: string;
    name: string;
    submissionId: string | null;
    status: "not_started" | "in_progress" | "submitted" | "returned";
    currentStage: WorkflowStage | null;
    stagesCompleted: number;
    submittedAt: string | null;
    offloading: {
      level: OffloadingLevel;
      score: number;
      previousScore: number | null;
      topFactor: { factor: string; contribution: number; plainExplanation: string } | null;
    } | null;
  }>;
};

export type SubmissionProcess = {
  assignment: { id: string; title: string; courseId: string; courseName: string };
  student: { name: string };
  submission: {
    id: string;
    attemptNumber: number;
    status: "not_started" | "in_progress" | "submitted" | "returned";
    currentStage: WorkflowStage;
    startedAt: string | null;
    submittedAt: string | null;
  };
  stages: Array<{
    stage: WorkflowStage;
    status: "locked" | "in_progress" | "completed";
    startedAt: string | null;
    completedAt: string | null;
    versions: number;
    content: string | null;
    writing: WritingSummary | null;
  }>;
  tutor: {
    promptCount: number;
    intents: Record<PromptIntent, number>;
    redirected: number;
    messages: Array<{
      id: string;
      author: "student" | "tutor" | "system";
      content: string;
      mode: "hint" | "feedback" | null;
      intent: PromptIntent | null;
      wasRedirected: boolean;
      createdAt: string;
    }>;
  };
  offloading: {
    level: OffloadingLevel;
    score: number;
    intentInput: number;
    effortInput: number;
    studentReport: string;
    recommendations: string[];
    factors: Array<{ factor: string; contribution: number; plainExplanation: string }>;
    computedAt: string;
  } | null;
  trend: Array<{
    assignmentId: string;
    assignmentTitle: string;
    submissionId: string;
    level: OffloadingLevel;
    score: number;
    at: string | null;
    current: boolean;
  }>;
};

export type WritingSummary = {
  activeSeconds: number;
  typedChars: number;
  deletedChars: number;
  pasteCount: number;
  pastedChars: number;
  largestPaste: number;
  longPauses: number;
  focusLosses: number;
  finalChars: number;
  pastedShare: number;
};

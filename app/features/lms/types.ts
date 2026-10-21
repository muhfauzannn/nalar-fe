export type ProgressSummary = {
  completed: number;
  total: number;
  percentage: number;
  lessons: { completed: number; total: number };
  assignments: { completed: number; total: number };
  quizzes: { completed: number; total: number };
};

export type CourseSummary = {
  id: string;
  enrollmentId: string;
  name: string;
  description: string | null;
  status: "published" | "archived";
  subjectName: string;
  subjectCode: string;
  progress: ProgressSummary;
};

// There is no school concept any more: only an optional student profile.
export type StudentProfile = { gradeLevel: number } | null;

export type StudentShellData = {
  user: { id: string; name: string; email: string; image: string | null };
  profile: StudentProfile;
};

export type DashboardData = {
  user: { name: string };
  profile: StudentProfile;
  courses: CourseSummary[];
  upcoming: Array<{
    id: string;
    type: "assignment" | "quiz";
    title: string;
    courseName: string;
    dueAt: string | null;
    status: string;
  }>;
  summary: {
    activeCourses: number;
    completedItems: number;
    totalItems: number;
    progress: number;
  };
};

export type CourseData = {
  course: Omit<CourseSummary, "progress">;
  teachers: string[];
  progress: ProgressSummary;
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    position: number;
    lessons: Array<{
      id: string;
      title: string;
      position: number;
      status: "not_started" | "in_progress" | "completed";
    }>;
  }>;
  assignments: Array<{
    id: string;
    moduleId: string | null;
    title: string;
    dueAt: string | null;
    closesAt: string | null;
    status: string;
    submissionStatus: string | null;
    currentStage: string | null;
  }>;
  quizzes: Array<{
    id: string;
    moduleId: string | null;
    title: string;
    dueAt: string | null;
    closesAt: string | null;
    status: string;
    timeLimitMinutes: number | null;
    attemptStatus: string | null;
    attemptStartedAt: string | null;
    score: string | null;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    publishedAt: string | null;
  }>;
};

export type LessonData = {
  id: string;
  title: string;
  content: string | null;
  moduleTitle: string;
  courseId: string;
  courseName: string;
  enrollmentId: string;
  progressStatus: "not_started" | "in_progress" | "completed" | null;
  resources: Array<{
    id: string;
    type: "text" | "link" | "file";
    title: string;
    content: string | null;
    url: string | null;
    position: number;
  }>;
};

export type WorkflowStage =
  | "1_independent_effort"
  | "2_guided_questioning"
  | "3_ai_evaluation"
  | "4_revision_finalization"
  | "5_reflection";

export type OffloadingLevel =
  | "1_ai_as_tool"
  | "2_ai_as_scaffold"
  | "3_partial_offloading"
  | "4_full_offloading";

export type OffloadingResult = {
  level: OffloadingLevel;
  score: number;
  intentInput: number;
  effortInput: number;
  studentReport: string;
  recommendations: string[];
  factors: Array<{
    factor: string;
    contribution: number;
    plainExplanation: string;
  }>;
  computedAt: string;
};

export type AiRelianceLevel = "none" | "low" | "moderate" | "high";

export type QuizUsageReflection = {
  relianceLevel: AiRelianceLevel;
  studentReport: string;
  recommendations: string[];
  promptTurnCount: number;
  directCount: number;
  hintCount: number;
  reflectiveCount: number;
  redirectedCount: number;
  computedAt: string;
};

export type AssignmentData = {
  id: string;
  title: string;
  instructions: string;
  status: string;
  availableAt: string | null;
  dueAt: string | null;
  closesAt: string | null;
  courseId: string;
  courseName: string;
  availability: "available" | "upcoming" | "closed" | "read_only";
  canStart: boolean;
  canContinue: boolean;
  criteria: Array<{
    id: string;
    label: string;
    description: string;
    maxPoints: string;
    position: number;
  }>;
  submission: null | {
    id: string;
    status: "in_progress" | "submitted" | "returned";
    currentStage: WorkflowStage;
    submittedAt: string | null;
    stages: Array<{ stage: WorkflowStage; status: "locked" | "in_progress" | "completed" }>;
    artifacts: Array<{ stage: WorkflowStage; content: string; version: number }>;
    assessment: null | { score: string; feedback: string | null };
    offloading: OffloadingResult | null;
  };
};

export type AssignmentErrorCode =
  | "ASSIGNMENT_NOT_FOUND"
  | "ASSIGNMENT_ENROLLMENT_INACTIVE"
  | "ASSIGNMENT_NOT_AVAILABLE"
  | "ASSIGNMENT_SUBMISSION_NOT_FOUND"
  | "ASSIGNMENT_SUBMISSION_SUBMITTED"
  | "ASSIGNMENT_SUBMISSION_EXPIRED"
  | "ASSIGNMENT_STAGE_INVALID"
  | "ASSIGNMENT_STAGE_OUT_OF_ORDER"
  | "ASSIGNMENT_CONTENT_INVALID"
  | "ASSIGNMENT_SUBMIT_CONFLICT";

export type QuizAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  awardedPoints: string | null;
};

export type QuizAnswerSubmission =
  | { questionId: string; selectedOptionId: string }
  | { questionId: string; textAnswer: string };

export type QuizAnswerSaveResult = {
  saved?: boolean;
  deleted?: boolean;
  savedAt?: string;
};

export type QuizErrorCode =
  | "QUIZ_NOT_FOUND"
  | "QUIZ_ENROLLMENT_INACTIVE"
  | "QUIZ_NOT_AVAILABLE"
  | "QUIZ_ALREADY_STARTED"
  | "QUIZ_EMPTY"
  | "QUIZ_NOT_READY"
  | "QUIZ_ATTEMPT_NOT_FOUND"
  | "QUIZ_ATTEMPT_SUBMITTED"
  | "QUIZ_ATTEMPT_EXPIRED"
  | "QUIZ_QUESTION_INVALID"
  | "QUIZ_ANSWER_INVALID"
  | "QUIZ_ANSWERS_INCOMPLETE"
  | "QUIZ_START_CONFLICT"
  | "QUIZ_SUBMIT_CONFLICT";

export type QuizData = {
  quiz: {
    id: string;
    title: string;
    instructions: string | null;
    status: string;
    availableAt: string | null;
    dueAt: string | null;
    closesAt: string | null;
    timeLimitMinutes: number | null;
    courseId: string;
    courseName: string;
  };
  questions: Array<{
    id: string;
    type: "multiple_choice" | "short_answer";
    prompt: string;
    explanation?: string | null;
    correctAnswer?: string;
    points: string;
    position: number;
    options: Array<{
      id: string;
      label: string;
      position: number;
      isCorrect?: boolean;
    }>;
  }>;
  attempt: null | {
    id: string;
    status: "in_progress" | "submitted";
    score: string | null;
    startedAt: string;
    submittedAt: string | null;
    expiresAt: string | null;
    isExpired: boolean;
    remainingSeconds: number | null;
    canContinue: boolean;
    answers: QuizAnswer[];
    reflection?: QuizUsageReflection | null;
  };
  availability:
    | "available"
    | "upcoming"
    | "closed"
    | "read_only"
    | "not_ready";
  canStart: boolean;
};

export type AiTutorMode = "hint" | "feedback";
export type AiTutorChannel = "chat" | "voice";
export type AiTutorTarget =
  | { targetType: "assignment"; targetId: string }
  | { targetType: "quiz"; targetId: string; questionId: string };

export type AiTutorMessage = {
  id: string;
  clientEventId: string;
  author: "student" | "tutor" | "system";
  content: string;
  mode: AiTutorMode | null;
  wasRedirected: boolean;
  modelVersion: string | null;
  quizQuestionId: string | null;
  sequence: number;
  createdAt: string;
  intent:
    | "direct_answer"
    | "explanation_hint"
    | "reflective_evaluative"
    | null;
};

export type AiTutorSessionData = {
  conversationId: string;
  token: string;
  model: string;
  expiresAt: string;
  mode: AiTutorMode;
  questionId: string | null;
  messages: AiTutorMessage[];
};

export type AiTutorClassification = {
  messageId: string;
  intent: "direct_answer" | "explanation_hint" | "reflective_evaluative";
  confidence: number;
  isFallback: boolean;
  wasRedirected: boolean;
  responseInstruction: string;
};

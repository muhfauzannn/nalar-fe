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
    aiAssistantEnabled?: boolean;
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
    /** An uploaded PDF, opened through the API (see `studentResourceFileUrl`). */
    file: { name: string; size: number } | null;
    position: number;
  }>;
  labs: Array<{ id: string; labKey: string; solved: string[] }>;
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
    tutorMessages?: Array<{ id: string; author: "student" | "tutor"; content: string }>;
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
    aiAssistantEnabled?: boolean;
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
  | { targetType: "quiz"; targetId: string; questionId: string }
  | { targetType: "lab"; targetId: string };

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

/** One line of a tutor conversation as the thread shows it. */
export type TutorThreadMessage = Pick<AiTutorMessage, "id" | "author" | "content">;

export type AiTutorSessionData = {
  conversationId: string;
  token: string;
  model: string;
  expiresAt: string;
  /** Google's hard cap on one Live connection; clients renew before it. Absent on older servers. */
  maxSessionSeconds?: number;
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

// Poin Nalar (PRD §5.9): process behaviours only, never the AI Offloading Index.
export type ProcessPointKind =
  | "independent_draft"
  | "hint_request"
  | "reflective_question"
  | "critical_evaluation"
  | "substantial_revision"
  | "specific_reflection"
  | "journey_complete";

export type EarnedPoint = { kind: ProcessPointKind; stage: WorkflowStage; points: number };

export type PointEvent = EarnedPoint & {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  at: string;
};

export type BadgeProgress = {
  id: "penjelajah" | "penjelas" | "tekun" | "bangkit";
  progress: number;
  target: number;
  earned: boolean;
};

export type PostStatus = "done" | "current" | "locked";

export type IslandData = {
  course: { id: string; name: string; subjectName: string };
  points: { total: number };
  labs: Array<{ id: string; lessonId: string; labKey: string; solved: number; challenges: number }>;
  badges: BadgeProgress[];
  bridge: { planks: number; total: number; students: number };
  buildings: Array<{
    assignmentId: string;
    title: string;
    dueAt: string | null;
    open: boolean;
    submissionStatus: string | null;
    posts: Array<{ stage: WorkflowStage; status: PostStatus; points: number; earned: ProcessPointKind[] }>;
    chestOpen: boolean;
    points: number;
  }>;
  recent: PointEvent[];
};

export type LevelProgress = { level: number; title: string; into: number; needed: number };

export type MissionId = "light_posts" | "ask_well" | "revise_deeply";

// Level, weekly rhythm and missions come from Poin Nalar and completed stages
// only; the AI Offloading Index never feeds them.
export type PointsData = {
  total: number;
  level: LevelProgress;
  week: { activeDays: number[]; target: number; streakWeeks: number; daysLeft: number };
  missions: Array<{ id: MissionId; progress: number; target: number }>;
  badges: BadgeProgress[];
  recent: PointEvent[];
};

/**
 * Just enough of an island to draw it as it really is (world3d/layout.ts): its
 * places with done/total, and its halls in order with their post states. Dunia
 * gets one per island from /api/student/world; up close the same is derived
 * from the course and island data, so both give the same island.
 */
export type IslandSketch = {
  places: Array<{ place: "library" | "lab" | "arena"; done: number; total: number }>;
  halls: Array<{ assignmentId: string; title: string; chestOpen: boolean; posts: PostStatus[] | null }>;
};

/** A quiz or an assignment still to do, with a due date: what the world's Tenggat lists. */
export type UpcomingWork = {
  id: string;
  courseId: string;
  type: "assignment" | "quiz";
  title: string;
  courseName: string;
  dueAt: string;
  status: string;
};

export type WorldData = PointsData & {
  /** Soonest first. Missing from an older API: the world then has no Tenggat. */
  upcoming?: UpcomingWork[];
  islands: Array<{
    course: { id: string; name: string; subjectName: string };
    /** Missing from an older API: the island is then drawn as a stand-in until its course loads. */
    sketch?: IslandSketch;
    halls: number;
    hallsDone: number;
    points: number;
    bridge: { planks: number; total: number; students: number };
    current: {
      assignmentId: string;
      title: string;
      postsDone: number;
      post: { index: number; stage: WorkflowStage } | null;
    } | null;
  }>;
};

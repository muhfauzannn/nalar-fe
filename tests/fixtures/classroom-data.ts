import type {
  AssignmentData,
  CourseData,
  IslandData,
  LessonData,
  QuizData,
  WorkflowStage,
} from "../../app/features/lms/types";
export const course: CourseData = {
  course: {
    id: "course-a",
    enrollmentId: "enrollment-a",
    name: "Kelas Fisika",
    description: null,
    status: "published",
    subjectName: "Fisika",
    subjectCode: "FIS",
  },
  teachers: [],
  progress: {
    completed: 0,
    total: 3,
    percentage: 0,
    lessons: { completed: 0, total: 1 },
    assignments: { completed: 0, total: 1 },
    quizzes: { completed: 0, total: 1 },
  },
  modules: [
    {
      id: "module-a",
      title: "Gaya dan gerak",
      description: null,
      position: 1,
      lessons: [
        {
          id: "lesson-a",
          title: "Bidang miring",
          position: 1,
          status: "not_started",
        },
      ],
    },
  ],
  assignments: [
    {
      id: "assignment-a",
      moduleId: "module-a",
      title: "Mengamati gaya gesek",
      dueAt: null,
      closesAt: null,
      status: "published",
      submissionStatus: null,
      currentStage: null,
    },
  ],
  quizzes: [
    {
      id: "quiz-a",
      moduleId: "module-a",
      title: "Kuis gaya dan gerak",
      dueAt: null,
      closesAt: null,
      status: "published",
      timeLimitMinutes: 10,
      attemptStatus: null,
      attemptStartedAt: null,
      score: null,
    },
  ],
  announcements: [],
};
export const island: IslandData = {
  course: { id: "course-a", name: "Kelas Fisika", subjectName: "Fisika" },
  points: { total: 0 },
  labs: [
    {
      id: "lab-a",
      lessonId: "lesson-a",
      labKey: "gerak-parabola",
      solved: 0,
      challenges: 3,
    },
  ],
  badges: [],
  bridge: { planks: 0, total: 1, students: 1 },
  buildings: [],
  recent: [],
};
export const lesson: LessonData = {
  id: "lesson-a",
  courseId: "course-a",
  title: "Bidang miring",
  content:
    "Amati perubahan gerak balok ketika sudut bidang dan permukaannya berubah.",
  moduleTitle: "Gaya dan gerak",
  courseName: "Kelas Fisika",
  enrollmentId: "enrollment-a",
  progressStatus: null,
  resources: [],
  labs: [{ id: "lab-a", labKey: "gerak-parabola", solved: [] }],
};
export const quiz: QuizData = {
  quiz: {
    id: "quiz-a",
    title: "Kuis gaya dan gerak",
    instructions:
      "Pilih jawaban yang paling tepat. Jawabanmu tersimpan otomatis.",
    status: "published",
    availableAt: null,
    dueAt: null,
    closesAt: null,
    timeLimitMinutes: 10,
    courseId: "course-a",
    courseName: "Kelas Fisika",
  },
  questions: [
    {
      id: "question-a",
      type: "multiple_choice",
      prompt: "Apa yang terjadi ketika sudut bidang miring diperbesar?",
      points: "100",
      position: 1,
      options: [
        {
          id: "option-a",
          label: "Komponen gaya gravitasi sejajar bidang membesar",
          position: 1,
        },
        { id: "option-b", label: "Massa balok bertambah", position: 2 },
      ],
    },
  ],
  attempt: null,
  availability: "available",
  canStart: true,
};
export const stages: WorkflowStage[] = [
  "1_independent_effort",
  "2_guided_questioning",
  "3_ai_evaluation",
  "4_revision_finalization",
  "5_reflection",
];
export const assignment: AssignmentData = {
  id: "assignment-a",
  title: "Mengamati gaya gesek",
  instructions:
    "Jelaskan pengaruh sudut bidang dan jenis permukaan terhadap gerak balok. Gunakan pengamatan dari meja percobaan.",
  status: "published",
  availableAt: null,
  dueAt: null,
  closesAt: null,
  courseId: "course-a",
  courseName: "Kelas Fisika",
  availability: "available",
  canStart: true,
  canContinue: true,
  criteria: [],
  submission: null,
};

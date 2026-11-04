import { createRoot } from "react-dom/client";
import { createMemoryRouter, Outlet, redirect, RouterProvider, useLocation } from "react-router";
import { CourseEditorPage } from "../../app/features/authoring/pages/course-editor-page";
import { MyCoursesPage } from "../../app/features/authoring/pages/my-courses-page";
import { AssignmentAnalyticsPage } from "../../app/features/authoring/pages/assignment-analytics-page";
import { QuizAnalyticsPage } from "../../app/features/authoring/pages/quiz-analytics-page";
import { QuizEditorPage } from "../../app/features/authoring/pages/quiz-editor-page";
import type { AssignmentAnalytics, CourseEditorData, ManagedCourseSummary, QuizAnalytics, QuizEditorData } from "../../app/features/authoring/types";
import "../../app/app.css";

// Kelola course without the student shell or a server: the real list and editor
// over a memory router whose /manage/courses/new answers like the app's action
// (a redirect to the editor, or a rejection for the name "Gagal"). `?kosong` starts
// with no courses; `?at=` is where the visit starts. The quiz editor also takes
// `?locked` (a quiz students already took) and `?tanpasoal` (no question yet).
const query = new URL(location.href).searchParams;
const start = query.get("at") ?? "/manage";

const courses: ManagedCourseSummary[] = [
  { id: "c1", name: "Fisika Kelas XI — Gelombang dan Optik", description: "Gelombang mekanik, bunyi, cahaya, dan alat optik lewat lab interaktif.", status: "published", subjectName: "Fisika", joinCode: "K7M2QX9P", studentCount: 37, quizCount: 4, assignmentCount: 3 },
  { id: "c2", name: "Matematika Peminatan XI", description: "Fungsi kuadrat dan trigonometri.", status: "published", subjectName: "Matematika", joinCode: "R4TN8WZ2", studentCount: 37, quizCount: 2, assignmentCount: 1 },
  { id: "c3", name: "Kimia Dasar", description: null, status: "draft", subjectName: "Kimia", joinCode: "H9LC3VB5", studentCount: 0, quizCount: 0, assignmentCount: 0 },
  { id: "c4", name: "Biologi Kelas X (semester lalu)", description: "Sel, jaringan, dan ekosistem.", status: "archived", subjectName: "Biologi", joinCode: null, studentCount: 31, quizCount: 5, assignmentCount: 2 },
];
const subjects = [
  { id: "s1", code: "FIS", name: "Fisika" },
  { id: "s2", code: "MAT", name: "Matematika" },
];
const editor: CourseEditorData = {
  course: { id: "c1", name: courses[0]!.name, description: courses[0]!.description, status: "published", subjectId: "s1", subjectName: "Fisika", joinCode: "K7M2QX9P" },
  studentCount: 37,
  modules: [],
  quizzes: [
    { id: "q1", title: "Kuis Bab 1 — Gelombang", status: "published", moduleId: null, dueAt: null, closesAt: null, questionCount: 3, attemptCount: 31 },
    { id: "q2", title: "Kuis Bab 2", status: "draft", moduleId: null, dueAt: null, closesAt: null, questionCount: 0, attemptCount: 0 },
  ],
  assignments: [
    { id: "a1", title: "Analisis gelombang di pantai", status: "published", moduleId: null, scenarioTitle: "Gelombang laut", dueAt: null, closesAt: null, submissionCount: 12 },
  ],
};
const locked = query.has("locked");
const quiz: QuizEditorData = {
  quiz: { id: "q1", courseId: "c1", moduleId: null, title: "Kuis Bab 1 — Gelombang", instructions: "Kerjakan dengan tenang.", status: locked ? "published" : "draft", availableAt: null, dueAt: null, closesAt: null, timeLimitMinutes: 30 },
  questions: query.has("tanpasoal")
    ? []
    : [
        {
          id: "s1", type: "multiple_choice", prompt: "Berapakah panjang gelombang dengan f = 50 Hz dan v = 100 m/s?", explanation: "λ = v / f", acceptedAnswers: null, points: 2, position: 0,
          options: [
            { id: "o1", label: "0,5 m", isCorrect: false, position: 0 },
            { id: "o2", label: "2 m", isCorrect: true, position: 1 },
            { id: "o3", label: "5 m", isCorrect: false, position: 2 },
          ],
        },
        { id: "s2", type: "short_answer", prompt: "Satuan frekuensi dalam SI adalah ...", explanation: null, acceptedAnswers: ["hertz", "Hz"], points: 1, position: 1, options: [] },
      ],
  attemptCount: locked ? 12 : 0,
  locked,
  editable: !locked,
  readiness: { ready: true, questionCount: 2, problems: [] },
};

// The quiz's tutor reflections, one student per case the page has to tell apart.
// `?belum` is a class where nobody has a reflection yet.
const reflection = (relianceLevel: QuizAnalytics["distribution"][number]["level"], turns: number, direct: number, hint: number, reflective: number, redirected: number, report: string) => ({
  relianceLevel, studentReport: report, recommendations: ["Coba soalnya dulu sebelum bertanya."], promptTurnCount: turns, directCount: direct, hintCount: hint, reflectiveCount: reflective, redirectedCount: redirected, computedAt: "2026-10-01T09:05:00.000Z",
});
const noneYet = query.has("belum");
// Twelve students along the four routes of a class, and two who have not submitted.
const journey = (draftWords: number, draft: "strong" | "thin", asked: "probing" | "hints" | "answers", direct: number, revision: "deep" | "pasted", ownChange: number, pastedPercent = 0) => ({
  draftWords, draft, asked, prompts: { direct, hint: 1, reflective: asked === "probing" ? 2 : 0 }, revision, ownChange, pastedPercent,
});
const journeys = [
  ...[60, 72, 55].map((words) => journey(words, "strong", "probing", 0, "deep", 60)),
  ...[24, 30, 18, 33].map((words) => journey(words, "thin", "hints", 0, "deep", 40)),
  ...[13, 16, 11].map((words) => journey(words, "thin", "answers", 2, "pasted", 12, 80)),
  ...[5, 6].map((words) => journey(words, "thin", "answers", 3, "pasted", 5, 95)),
].map((item, index) => (query.has("kosong") ? null : { ...item, ownChange: item.ownChange + index }));
const classAnalytics: AssignmentAnalytics = {
  assignment: { id: "a1", title: "Susu basi", status: "published", dueAt: null, courseId: "c1", courseName: "Kimia" },
  counts: { enrolled: 14, notStarted: 2, inProgress: 0, submitted: 12, analyzed: 12 },
  distribution: [{ level: "1_ai_as_tool", count: 3 }, { level: "2_ai_as_scaffold", count: 4 }, { level: "3_partial_offloading", count: 3 }, { level: "4_full_offloading", count: 2 }],
  commonFactors: [],
  students: [...journeys, null, null].map((item, index) => ({
    membershipId: `m${index}`, name: `Siswa ${index + 1}`, submissionId: item ? `s${index}` : null, status: item ? "submitted" : "not_started",
    currentStage: null, stagesCompleted: item ? 5 : 0, submittedAt: null, offloading: null, journey: item,
  })),
  journeyRules: { strongDraftWords: 40, deepRevisionPercent: 25 },
};

const analytics: QuizAnalytics = {
  quiz: { id: "q1", title: "Kuis Bab 1 — Gelombang", status: "published", dueAt: null, courseId: "c1", courseName: "Fisika Kelas XI — Gelombang dan Optik" },
  counts: noneYet ? { enrolled: 2, notStarted: 1, inProgress: 0, submitted: 1, reflected: 0 } : { enrolled: 7, notStarted: 1, inProgress: 1, submitted: 4, reflected: 3 },
  distribution: noneYet
    ? [{ level: "none", count: 0 }, { level: "low", count: 0 }, { level: "moderate", count: 0 }, { level: "high", count: 0 }]
    : [{ level: "none", count: 1 }, { level: "low", count: 1 }, { level: "moderate", count: 0 }, { level: "high", count: 1 }],
  students: noneYet
    ? [
        { membershipId: "m1", name: "Ani", attemptNumber: 1, status: "submitted", submittedAt: "2026-10-01T09:00:00.000Z", reflection: null },
        { membershipId: "m2", name: "Budi", attemptNumber: null, status: "not_started", submittedAt: null, reflection: null },
      ]
    : [
        { membershipId: "m1", name: "Ani", attemptNumber: 1, status: "submitted", submittedAt: "2026-10-01T09:00:00.000Z", reflection: reflection("low", 5, 0, 3, 2, 0, "Kamu bertanya dengan hati-hati dan mengerjakan sisanya sendiri.") },
        { membershipId: "m2", name: "Budi", attemptNumber: 1, status: "submitted", submittedAt: "2026-10-01T09:00:00.000Z", reflection: reflection("high", 8, 7, 1, 0, 4, "Kebanyakan pertanyaanmu meminta jawaban jadi.") },
        { membershipId: "m3", name: "Citra", attemptNumber: 1, status: "submitted", submittedAt: "2026-10-01T09:00:00.000Z", reflection: reflection("none", 0, 0, 0, 0, 0, "Kamu mengerjakan kuis tanpa bertanya ke tutor.") },
        { membershipId: "m4", name: "Dodi", attemptNumber: 1, status: "in_progress", submittedAt: null, reflection: null },
        { membershipId: "m5", name: "Eka", attemptNumber: null, status: "not_started", submittedAt: null, reflection: null },
        { membershipId: "m6", name: "Fitri", attemptNumber: 1, status: "submitted", submittedAt: "2026-10-01T09:00:00.000Z", reflection: null },
        { membershipId: "m7", name: "Muhammad Aryasatya Wiratama Kusumawardhana Putra", attemptNumber: null, status: "not_started", submittedAt: null, reflection: null },
      ],
};

function Url() {
  const { pathname, search } = useLocation();
  return <output data-testid="url" className="sr-only">{pathname + search}</output>;
}

const router = createMemoryRouter(
  [
    {
      path: "/",
      Component: () => (
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
          <Url />
          <Outlet />
        </main>
      ),
      children: [
        { path: "manage", Component: () => <MyCoursesPage data={{ courses: query.has("kosong") ? [] : courses, subjects }} /> },
        {
          path: "manage/courses/new",
          loader: () => redirect("/manage?buat"),
          action: async ({ request }) => {
            const name = String((await request.formData()).get("name") ?? "").trim().toLowerCase();
            await new Promise((resolve) => setTimeout(resolve, 150));
            if (name === "gagal") return { ok: false, error: "Nama course sudah dipakai." };
            return redirect("/manage/courses/c1");
          },
        },
        { path: "manage/quizzes/:quizId", Component: () => <QuizEditorPage data={quiz} /> },
        { path: "manage/quizzes/:quizId/analytics", Component: () => <QuizAnalyticsPage data={analytics} /> },
        { path: "manage/assignments/:assignmentId/analytics", Component: () => <AssignmentAnalyticsPage data={classAnalytics} /> },
        { path: "manage/assignments/:assignmentId/analytics/:submissionId", Component: () => <p>Proses siswa</p> },
        { path: "manage/courses/:courseId", Component: () => <CourseEditorPage data={editor} subjects={subjects} scenarios={[]} /> },
      ],
    },
  ],
  { initialEntries: [start] },
);
(window as unknown as { router: typeof router }).router = router;

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);

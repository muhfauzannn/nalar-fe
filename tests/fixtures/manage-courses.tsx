import { createRoot } from "react-dom/client";
import { createMemoryRouter, Outlet, redirect, RouterProvider, useLocation } from "react-router";
import { CourseEditorPage } from "../../app/features/authoring/pages/course-editor-page";
import { MyCoursesPage } from "../../app/features/authoring/pages/my-courses-page";
import { QuizEditorPage } from "../../app/features/authoring/pages/quiz-editor-page";
import type { CourseEditorData, ManagedCourseSummary, QuizEditorData } from "../../app/features/authoring/types";
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
        { path: "manage/courses/:courseId", Component: () => <CourseEditorPage data={editor} subjects={subjects} scenarios={[]} /> },
      ],
    },
  ],
  { initialEntries: [start] },
);
(window as unknown as { router: typeof router }).router = router;

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);

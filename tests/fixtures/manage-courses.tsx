import { createRoot } from "react-dom/client";
import { createMemoryRouter, Outlet, redirect, RouterProvider, useLocation } from "react-router";
import { CourseEditorPage } from "../../app/features/authoring/pages/course-editor-page";
import { MyCoursesPage } from "../../app/features/authoring/pages/my-courses-page";
import type { CourseEditorData, ManagedCourseSummary } from "../../app/features/authoring/types";
import "../../app/app.css";

// Kelola course without the student shell or a server: the real list and editor
// over a memory router whose /manage/courses/new answers like the app's action
// (a redirect to the editor, or a rejection for the name "Gagal"). `?kosong` starts
// with no courses; `?at=` is where the visit starts.
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
  quizzes: [],
  assignments: [],
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
        { path: "manage/courses/:courseId", Component: () => <CourseEditorPage data={editor} subjects={subjects} scenarios={[]} /> },
      ],
    },
  ],
  { initialEntries: [start] },
);
(window as unknown as { router: typeof router }).router = router;

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);

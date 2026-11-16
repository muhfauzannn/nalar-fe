import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider, useLoaderData } from "react-router";
import { LessonEditorPage } from "../../app/features/authoring/pages/lesson-editor-page";
import type { LessonEditorData } from "../../app/features/authoring/types";
import "../../app/app.css";

// The lesson editor with mock data; every action answers ok, and attaching a lab adds it to the lesson.
const data: LessonEditorData = {
  lesson: {
    id: "lesson-1",
    title: "Gerak parabola di sekitar kita",
    content: "Benda yang dilempar miring bergerak dalam lintasan parabola.\n\nJarak terjauh: \\( R = \\frac{v^2 \\sin 2\\theta}{g} \\)",
    status: "draft",
    moduleId: "m1",
    moduleTitle: "Kinematika",
    courseId: "c1",
    courseName: "Fisika X",
  },
  resources: [
    { id: "r1", type: "link", title: "Video simulasi PhET", content: null, url: "https://phet.colorado.edu", file: null, position: 0 },
    { id: "r2", type: "text", title: "Ringkasan rumus", content: "Waktu di udara \\( t = 2 v \\sin\\theta / g \\).", url: null, file: null, position: 1 },
    { id: "r3", type: "file", title: "LKS gerak parabola", content: null, url: null, file: { name: "lks-parabola.pdf", size: 482_000 }, position: 2 },
  ],
  labs: [{ id: "lab-1", labKey: "mesin-gelombang" }],
  labCatalog: [
    { key: "gerak-parabola", title: "Gerak parabola", subject: "Fisika" },
    { key: "mesin-gelombang", title: "Mesin gelombang", subject: "Matematika" },
    { key: "reaktor-tumbukan", title: "Reaktor tumbukan", subject: "Kimia" },
    { key: "mikroskop-osmosis", title: "Mikroskop osmosis", subject: "Biologi" },
  ],
};

const router = createMemoryRouter(
  [
    {
      path: "/manage/lessons/:lessonId",
      loader: () => structuredClone(data),
      action: async ({ request }) => {
        const form = await request.formData();
        (window as unknown as { lastAction: unknown }).lastAction = Object.fromEntries(form);
        await new Promise((done) => setTimeout(done, 300));
        if (form.get("intent") === "lesson-update") {
          data.lesson = { ...data.lesson, title: String(form.get("title")), status: form.get("status") as typeof data.lesson.status, content: String(form.get("content")) };
        }
        if (form.get("intent") === "lab-attach") data.labs = [...data.labs, { id: `lab-${Date.now()}`, labKey: String(form.get("labKey")) }];
        return { ok: true };
      },
      Component: () => (
        <main className="mx-auto min-h-dvh max-w-5xl bg-background p-4 text-foreground sm:p-8">
          <LessonEditorPage data={useLoaderData() as LessonEditorData} />
        </main>
      ),
    },
    { path: "/manage/*", Component: () => <p>Kelola</p> },
  ],
  { initialEntries: ["/manage/lessons/lesson-1"] },
);

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);

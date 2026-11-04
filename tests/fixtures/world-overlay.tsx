import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from "react-router";
import WorldStage from "../../app/features/lms/world3d/stage";
import { WorldOverlay } from "../../app/features/lms/world3d/overlays";
import { WorldOverlayContext } from "../../app/features/lms/world3d/mode";
import type { PostStatus, UpcomingWork, WorldData } from "../../app/features/lms/types";
import "../../app/app.css";

// The real HUD with sample data, and no backend: the islands ask for their
// courses and get a refusal. `?scene` also draws the real 3D world (software
// rendering is slow, so only what is about the scene asks for it). `?kosong` is
// a student with nothing due; `?lama` is an older API that sends no deadlines.
const query = new URL(location.href).searchParams;

// Tomorrow at 16.00 is always urgent and always "besok"; the rest can wait.
const at = (daysAhead: number, hour: number) => {
  const due = new Date();
  due.setDate(due.getDate() + daysAhead);
  due.setHours(hour, 0, 0, 0);
  return due.toISOString();
};
const work = (id: string, courseId: string, type: UpcomingWork["type"], title: string, courseName: string, dueAt: string): UpcomingWork => ({ id, courseId, type, title, courseName, dueAt, status: "not_started" });
const physics = "Fisika Kelas XI — Gelombang dan Optik";
const upcoming = query.has("kosong")
  ? []
  : query.has("lama")
    ? undefined
    : [
        work("q1", "c1", "quiz", "Kuis Bab 1 — Gelombang", physics, at(1, 16)),
        work("a1", "c1", "assignment", "Analisis gelombang di pantai", physics, at(5, 14)),
        work("q2", "c2", "quiz", "Kuis Fungsi Kuadrat", "Matematika Peminatan XI", at(6, 8)),
      ];

const sketch = (hall: PostStatus[]) => ({
  places: [
    { place: "library" as const, done: 1, total: 2 },
    { place: "lab" as const, done: 0, total: 2 },
    { place: "arena" as const, done: 0, total: 1 },
  ],
  halls: [{ assignmentId: "a1", title: "Analisis gelombang di pantai", chestOpen: false, posts: hall }],
});
const island = (id: string, name: string, subjectName: string, hall: PostStatus[]) => ({
  course: { id, name, subjectName },
  sketch: sketch(hall),
  halls: 1,
  hallsDone: 0,
  points: 0,
  bridge: { planks: 0, total: 5, students: 30 },
  current: { assignmentId: "a1", title: "Analisis gelombang di pantai", postsDone: hall.indexOf("current"), post: { index: hall.indexOf("current") + 1, stage: "2_guided_questioning" as const } },
});

const data: WorldData = {
  total: 420,
  level: { level: 4, title: "Penjelajah", into: 62, needed: 100 },
  week: { activeDays: [1, 2, 3], target: 4, streakWeeks: 3, daysLeft: 3 },
  missions: [
    { id: "light_posts", progress: 1, target: 3 },
    { id: "ask_well", progress: 1, target: 1 },
    { id: "revise_deeply", progress: 0, target: 1 },
  ],
  badges: [],
  recent: [],
  upcoming,
  islands: [
    island("c1", physics, "Fisika", ["done", "current", "locked", "locked", "locked"]),
    island("c2", "Matematika Peminatan XI", "Matematika", ["current", "locked", "locked", "locked", "locked"]),
    island("c3", "Kimia Dasar", "Kimia", ["current", "locked", "locked", "locked", "locked"]),
  ],
};

const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
  if (url.pathname.startsWith("/api/") || url.port === "8000") return Response.json({ error: "fixture" }, { status: 503 });
  return nativeFetch(input, init);
};

function Shell() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const { pathname, search } = useLocation();
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      {query.has("scene") && <WorldStage />}
      <div ref={setHost} className="pointer-events-none absolute inset-0 z-10" />
      <output data-testid="url" className="sr-only">{pathname + search}</output>
      <WorldOverlayContext.Provider value={host}>
        <Outlet />
      </WorldOverlayContext.Provider>
    </main>
  );
}

const router = createMemoryRouter(
  [
    {
      path: "/",
      Component: Shell,
      children: [
        { path: "dunia", Component: () => <WorldOverlay data={data} name="Ayu" /> },
        { path: "courses/:courseId/kelas", Component: () => null },
        { path: "courses/:courseId/balai/:assignmentId", Component: () => null },
      ],
    },
  ],
  { initialEntries: ["/dunia"] },
);

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);

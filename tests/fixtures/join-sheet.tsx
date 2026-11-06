import { createRoot } from "react-dom/client";
import { createMemoryRouter, redirect, RouterProvider, useLocation } from "react-router";
import { JoinCourseSheet } from "../../app/features/lms/components/join-course-sheet";
import { WorldIslandCarousel } from "../../app/features/lms/components/world-island-carousel";
import type { WorldData } from "../../app/features/lms/types";
import { useJoinSheet } from "../../app/features/lms/world3d/join";
import "../../app/app.css";

// The world's join wiring without the canvas: the real hook and sheet over a
// memory router whose /courses/join answers like the app's action (a redirect
// to the island, or a rejection). `?at=` is where the visit starts.
const islands = [{ course: { id: "course-a", subjectName: "Fisika", name: "Kelas A" } }] as WorldData["islands"];
const start = new URL(location.href).searchParams.get("at") ?? "/dunia";

function World() {
  const join = useJoinSheet();
  const { pathname, search } = useLocation();
  return (
    <main className="min-h-dvh bg-[#d6ccf4] p-4 text-[#18153a]">
      <p>Dunia</p>
      <output data-testid="url">{pathname + search}</output>
      <button type="button" onClick={() => join.open()}>Buka gabung</button>
      <WorldIslandCarousel islands={islands} onJoin={() => join.open()} />
      <JoinCourseSheet open={join.sheet !== null} code={join.sheet?.code ?? ""} onClose={join.close} />
    </main>
  );
}

const router = createMemoryRouter(
  [
    { path: "/dunia", Component: World },
    {
      path: "/courses/join",
      action: async ({ request }) => {
        const code = String((await request.formData()).get("code") ?? "").trim().toUpperCase();
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (code === "K7M2-QX9P") return redirect("/courses/course-a");
        return { ok: false, error: "Kode kelas tidak ditemukan." };
      },
    },
    { path: "/courses/course-a", Component: () => <p>Kelas Fisika</p> },
  ],
  { initialEntries: [start] },
);
(window as unknown as { router: typeof router }).router = router;

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { TooltipProvider } from "../../app/components/ui/tooltip";
import { AssignmentPage } from "../../app/features/lms/pages/assignment-page";
import type { AssignmentData, WorkflowStage } from "../../app/features/lms/types";
import { assignment, stages } from "./classroom-data";
import "../../app/app.css";

// One task at one post: `?pos=<1-5>`, `&tanpa-tutor=1` for a student who never asked, `&buku=1` for the classroom's book.
const search = new URL(location.href).searchParams;
const post = Number(search.get("pos") ?? 1);
const texts: Partial<Record<WorkflowStage, string>> = {
  "1_independent_effort": "Balok lebih mudah turun kalau bidangnya curam.",
  "2_guided_questioning": "",
  "3_ai_evaluation": "Petunjuk NALAR benar, tetapi belum menyebut jenis permukaan.",
  "4_revision_finalization": "Balok turun saat komponen berat melebihi gaya gesek maksimum.",
};
const dataAt = (at: number): AssignmentData => ({
  ...assignment,
  canStart: false,
  submission: {
    id: "submission-a",
    status: "in_progress",
    currentStage: stages[at - 1] as WorkflowStage,
    submittedAt: null,
    stages: stages.map((item, index) => ({
      stage: item as WorkflowStage,
      status: index < at - 1 ? "completed" : index === at - 1 ? "in_progress" : "locked",
    })),
    artifacts: stages.slice(0, at - 1).map((item) => ({ stage: item as WorkflowStage, content: texts[item as WorkflowStage] ?? "", version: 1 })),
    tutorMessages: search.get("tanpa-tutor")
      ? []
      : [
          { id: "m1", author: "student", content: "Kenapa baloknya baru turun di sudut tertentu?" },
          { id: "m2", author: "tutor", content: "Coba uraikan gaya berat menjadi dua komponen." },
        ],
    assessment: null,
    offloading: null,
  },
});
function Desk() {
  const [at, setAt] = useState(post);
  return (
    <main className="mx-auto max-w-6xl p-4">
      <button type="button" onClick={() => setAt(at + 1)}>Pos berikutnya</button>
      {search.has("buku") ? (
        <div className="h-[34rem]"><AssignmentPage data={dataAt(at)} embedded /></div>
      ) : (
        <AssignmentPage data={dataAt(at)} />
      )}
    </main>
  );
}
const router = createMemoryRouter([{ path: "/", element: <Desk /> }]);
createRoot(document.getElementById("root")!).render(<TooltipProvider><RouterProvider router={router} /></TooltipProvider>);

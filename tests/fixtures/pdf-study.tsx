import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PdfStudyRoom } from "../../app/features/lms/components/pdf-study-room";
import "../../app/app.css";
const resources = [1, 2].map((n) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  title: `Materi pecahan ${n}`,
  type: "file" as const,
  content: null,
  url: null,
  file: { name: "pecahan.pdf", size: 800 },
  position: n,
}));
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main style={{ maxWidth: 1200, margin: "24px auto", padding: 16 }}>
      <PdfStudyRoom resources={resources} />
    </main>
  </StrictMode>,
);

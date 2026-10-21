import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { PdfTutorOverlay } from "../../app/features/lms/components/pdf-tutor-overlay";
import type {
  PdfAction,
  PdfGuidance,
} from "../../app/features/lms/lib/pdf-tutor";
import "../../app/app.css";
function Fixture() {
  const [guidance, setGuidance] = useState<PdfGuidance | null>(null);
  const [active, setActive] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const draw = (actions: PdfAction[]) => {
    setActive(true);
    setGuidance({
      resourceId: "fixture",
      page: 1,
      revision: 1,
      turnId: crypto.randomUUID(),
      caption: "Perhatikan setiap goresannya",
      actions,
    });
  };
  const width = (rotation % 180 ? 1035 : 800) * zoom;
  const height = (rotation % 180 ? 800 : 1035) * zoom;
  return (
    <main style={{ padding: 32 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <button
          onClick={() =>
            draw([
              { kind: "rectangle", x: 0.15, y: 0.18, width: 0.35, height: 0.2 },
            ])
          }
        >
          Draw rectangle
        </button>
        <button
          onClick={() =>
            draw([
              {
                kind: "text",
                x: 0.16,
                y: 0.3,
                width: 0,
                height: 0,
                text: "Luas = p × l",
              },
            ])
          }
        >
          Write equation
        </button>
        <button
          onClick={() =>
            draw([
              { kind: "rectangle", x: 0.12, y: 0.15, width: 0.4, height: 0.2 },
              {
                kind: "text",
                x: 0.13,
                y: 0.42,
                width: 0,
                height: 0,
                text: "Luas = p × l",
              },
              { kind: "arrow", x: 0.55, y: 0.28, width: 0.14, height: 0 },
            ])
          }
        >
          Draw lesson
        </button>
        <button onClick={() => setActive(false)}>Pause</button>
        <button onClick={() => setGuidance(null)}>Clear</button>
        <button
          onClick={() => {
            setActive(false);
            setZoom((v) => (v === 1 ? 1.25 : 1));
          }}
        >
          Zoom
        </button>
        <button
          onClick={() => {
            setActive(false);
            setRotation((v) => (v + 90) % 360);
          }}
        >
          Rotate
        </button>
      </div>
      <div
        style={{
          width,
          height,
          position: "relative",
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        <PdfTutorOverlay
          guidance={guidance}
          selection={null}
          rotation={rotation}
          size={{ width, height }}
          showCursor={active}
        />
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);

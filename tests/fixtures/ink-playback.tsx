import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { PdfTutorOverlay } from "../../app/features/lms/components/pdf-tutor-overlay";
import type {
  PdfAction,
  PdfCursorCue,
  PdfGuidance,
} from "../../app/features/lms/lib/pdf-tutor";
import "../../app/app.css";
function Fixture() {
  const [guidance, setGuidance] = useState<PdfGuidance | null>(null);
  const [cursorCue, setCursorCue] = useState<PdfCursorCue | null>(null);
  const [active, setActive] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const draw = (actions: PdfAction[]) => {
    setActive(true);
    setCursorCue(null);
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
        <button onClick={() => draw([
          { kind: "point", x: 0.2, y: 0.2, width: 0, height: 0, caption: "Baca konsep pertama", holdSeconds: 6 },
          { kind: "point", x: 0.7, y: 0.4, width: 0, height: 0, caption: "Baca contoh kedua", holdSeconds: 8 },
        ])}>Read two parts</button>
        <button onClick={() => draw([
          { kind: "rectangle", x: 0.1, y: 0.15, width: 0.3, height: 0.15, caption: "Bagian pertama" },
          { kind: "rectangle", x: 0.6, y: 0.4, width: 0.25, height: 0.15, caption: "Lalu bagian kedua" },
        ])}>Guide two parts</button>
        {[0.2, 0.7].map((x, index) => (
          <button key={x} onClick={() => setCursorCue({
            resourceId: "fixture", page: 1, revision: 1, turnId: "cursor-turn",
            x, y: 0.5, caption: index ? "Perhatikan penyebut" : "Perhatikan pembilang",
          })}>Move cursor {index + 1}</button>
        ))}
        <button onClick={() => setActive(false)}>Pause</button>
        <button onClick={() => { setGuidance(null); setCursorCue(null); }}>Clear</button>
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
          cursorCue={active ? cursorCue : null}
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

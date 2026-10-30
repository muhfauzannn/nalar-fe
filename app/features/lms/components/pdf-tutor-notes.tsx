import { useMemo } from "react";
import { handwritingPaths } from "../lib/handwriting/ink-plan";
import type { PdfGuidance } from "../lib/pdf-tutor";

/** A separate writing surface keeps AI notes legible even on a full PDF page. */
export function PdfTutorNotes({ guidance }: { guidance: PdfGuidance | null }) {
  const notes = guidance?.actions.filter((action) => action.kind === "text" && action.placement === "side" && action.text) ?? [];
  if (!notes.length) return null;
  return (
    <section className="max-h-56 space-y-2 overflow-y-auto border-b bg-secondary/25 p-3" aria-label="Catatan tutor">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Catatan tutor · halaman {guidance?.page}</p>
      {notes.map((action, index) => <WrittenNote key={`${guidance?.turnId}-${index}`} text={action.text!} />)}
    </section>
  );
}

function WrittenNote({ text }: { text: string }) {
  const ink = useMemo(() => handwritingPaths(text, 590, 38), [text]);
  const height = Math.max(68, ink.height + 42);
  return (
    <div className="rounded-lg border bg-card px-2 py-1 shadow-sm" data-testid="tutor-note" aria-label={text}>
      <svg className="w-full text-[color:var(--brand-lavender-foreground)]" viewBox={`0 0 650 ${height}`} aria-hidden="true">
        <g transform="translate(20 40)" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {ink.paths.map((d, index) => <path key={index} d={d} pathLength={1} className="pdf-tutor-side-stroke" style={{ animationDelay: `${Math.min(index * 0.018, 3.8)}s` }} />)}
        </g>
        <g transform="translate(20 40)" fill="currentColor">
          {ink.fallback.map((part, index) => <text key={index} x={part.x} y={part.y} fontSize={part.size}>{part.text}</text>)}
        </g>
      </svg>
      <span className="sr-only">{text}</span>
    </div>
  );
}

import { FlaskConical, Sparkles } from "lucide-react";
import { useState } from "react";

import { LABS } from "~/features/labs";
import { http } from "~/lib/http";
import { cn } from "~/lib/utils";
import type { LessonData } from "../types";
import { AiTutorPanel } from "./ai-tutor-panel";

// The labs attached to a lesson (PRD §5.10): a tool to understand the idea by
// applying it, never graded. Each solved challenge is recorded once. Beside each
// lab is an AI tutor that sees what the student is doing in it.
export function LessonLabs({ labs, onSolved }: { labs: LessonData["labs"]; onSolved?: () => void }) {
  const shown = labs.filter((lab) => LABS[lab.labKey]);
  if (shown.length === 0) return null;
  return (
    <section aria-label="Lab interaktif" className="flex flex-col gap-4">
      {shown.map((lab) => (
        <LessonLab key={lab.id} lab={lab} onSolved={onSolved} />
      ))}
    </section>
  );
}

function LessonLab({ lab, onSolved }: { lab: LessonData["labs"][number]; onSolved?: () => void }) {
  const entry = LABS[lab.labKey]!;
  const [state, setState] = useState("");
  const [tutorOpen, setTutorOpen] = useState(false);
  const solve = async (challenge: string) => {
    const result = await http.post<{ points: number }>(`/api/student/labs/${lab.id}/challenges/${challenge}`, {});
    onSolved?.();
    return result.points;
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-mint-soft text-brand-mint-foreground">
          <FlaskConical className="size-4.5" aria-hidden="true" />
        </span>
        <h2 className="font-heading text-lg font-semibold">Lab · {entry.title}</h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {lab.solved.length} dari {entry.challenges} tantangan
        </span>
        <button
          type="button"
          onClick={() => setTutorOpen((open) => !open)}
          aria-expanded={tutorOpen}
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition-transform duration-150 active:scale-[0.97]",
            tutorOpen ? "bg-foreground text-background ring-foreground" : "bg-card text-foreground ring-border",
          )}
        >
          <Sparkles className="size-4" aria-hidden="true" />
          {tutorOpen ? "Tutup tutor" : "Tanya AI Tutor"}
        </button>
      </div>
      <entry.Component solved={lab.solved} onSolve={solve} onState={setState} />
      {tutorOpen ? (
        <AiTutorPanel
          target={{ targetType: "lab", targetId: lab.id }}
          liveContext={state}
          placeholder="Tanya tentang lab ini…"
          className="h-[26rem] xl:h-[26rem]"
        />
      ) : null}
    </div>
  );
}

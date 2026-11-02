import { FlaskConical } from "lucide-react";

import { LABS } from "~/features/labs";
import { http } from "~/lib/http";
import type { LessonData } from "../types";

// The labs attached to a lesson (PRD §5.10): a tool to understand the idea by
// applying it, never graded. Each solved challenge is recorded once.
export function LessonLabs({ labs, onSolved }: { labs: LessonData["labs"]; onSolved?: () => void }) {
  const shown = labs.filter((lab) => LABS[lab.labKey]);
  if (shown.length === 0) return null;
  return (
    <section aria-label="Lab interaktif" className="flex flex-col gap-4">
      {shown.map((lab) => {
        const entry = LABS[lab.labKey]!;
        const solve = async (challenge: string) => {
          const result = await http.post<{ points: number }>(`/api/student/labs/${lab.id}/challenges/${challenge}`, {});
          onSolved?.();
          return result.points;
        };
        return (
          <div key={lab.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-mint-soft text-brand-mint-foreground">
                <FlaskConical className="size-4.5" aria-hidden="true" />
              </span>
              <h2 className="font-heading text-lg font-semibold">Lab · {entry.title}</h2>
              <span className="text-sm text-muted-foreground tabular-nums">
                {lab.solved.length} dari {entry.challenges} tantangan
              </span>
            </div>
            <entry.Component solved={lab.solved} onSolve={solve} />
          </div>
        );
      })}
    </section>
  );
}

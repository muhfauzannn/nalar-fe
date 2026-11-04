import { useEffect, useRef } from "react";

import { gameGsap, HAPTIC, haptic, playSound, prefersReducedMotion } from "~/features/game-feel";
import { cn } from "~/lib/utils";
import { postNames } from "../lib/game";
import type { WorkflowStage } from "../types";

type Post = { stage: WorkflowStage; status: "locked" | "in_progress" | "completed" };

// Five labels fit a phone only when each is one short word.
const shortNames: Record<WorkflowStage, string> = {
  "1_independent_effort": "Mandiri",
  "2_guided_questioning": "Tanya",
  "3_ai_evaluation": "Evaluasi",
  "4_revision_finalization": "Revisi",
  "5_reflection": "Refleksi",
};

const statusName: Record<Post["status"], string> = {
  completed: "menyala",
  in_progress: "sedang dikerjakan",
  locked: "terkunci",
};

/** The part of "pos menyala" every pad shares: the glow, a ring going out, the crystal dropping in. */
export function lightPad(timeline: gsap.core.Timeline, pad: HTMLElement) {
  timeline
    .fromTo(pad.querySelector("[data-glow]"), { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: "nalar.spring" })
    .fromTo(pad.querySelector("[data-ring]"), { scale: 0.9, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: 0.7, ease: "power2.out" }, "<");
  const crystal = pad.querySelector("[data-crystal]");
  if (crystal) timeline.fromTo(crystal, { y: -36, opacity: 0, scale: 0.6 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "bounce.out" }, "<0.05");
}

// The five pads of the island, carried onto the desk: the same crystals and the same cat, so a task
// reads as the path the student was walking. `lit` is the post just completed here: it lights up
// once and the cat hops on, then `onLit` lets the desk go quiet for writing.
export function PostTrack({ posts, lit = null, onLit }: { posts: Post[]; lit?: WorkflowStage | null; onLit?: () => void }) {
  const root = useRef<HTMLOListElement>(null);
  const played = useRef<WorkflowStage | null>(null);

  useEffect(() => {
    if (!lit || played.current === lit || !root.current) return;
    played.current = lit;
    const pad = root.current.querySelector<HTMLElement>(`[data-stage="${lit}"]`);
    if (!pad) return onLit?.();
    if (prefersReducedMotion()) {
      playSound("chord");
      haptic(HAPTIC.award);
      return onLit?.();
    }
    const timeline = gameGsap().timeline({ onComplete: () => onLit?.() });
    timeline
      .from(pad, { scale: 0.86, duration: 0.14, ease: "power2.in" })
      .add(() => { playSound("chord"); haptic(HAPTIC.award); });
    lightPad(timeline, pad);
    const cat = root.current.querySelector<HTMLElement>("[data-cat]");
    if (cat) {
      const distance = pad.getBoundingClientRect().left - cat.getBoundingClientRect().left;
      timeline
        .add(() => playSound("whoosh"))
        .fromTo(cat, { x: distance }, { x: 0, duration: 0.5, ease: "power2.inOut" })
        .fromTo(cat, { y: 0 }, { y: -14, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" }, "<");
    }
  }, [lit, onLit]);

  return (
    <ol ref={root} aria-label="Lima pos" data-lit={lit ?? undefined} className="flex w-full items-start">
      {posts.map((post, index) => {
        const done = post.status === "completed";
        const current = post.status === "in_progress";
        return (
          <li key={post.stage} aria-current={current ? "step" : undefined} className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5">
            {index < posts.length - 1 && (
              <span aria-hidden="true" className={cn("absolute top-5 left-1/2 h-1 w-full rounded-full", done ? "bg-brand-mint" : "bg-brand-lavender")} />
            )}
            <span data-stage={post.stage} className="relative grid size-11 place-items-center">
              <span
                aria-hidden="true"
                data-glow
                className={cn(
                  "absolute inset-0 rounded-full",
                  done && "bg-[radial-gradient(closest-side,rgb(214_255_238),rgb(75_210_159))] shadow-[0_0_0_3px_rgb(255_255_255/0.9),0_0_16px_4px_rgb(75_210_159/0.55)]",
                  current && "bg-white shadow-[0_0_0_3px_rgb(75_210_159)]",
                  post.status === "locked" && "bg-brand-lavender-soft shadow-[0_0_0_3px_var(--brand-lavender)]",
                )}
              />
              <span aria-hidden="true" data-ring className="absolute inset-0 rounded-full border-3 border-brand-mint opacity-0" />
              {done && <img src="/game/crystal.webp" alt="" data-crystal width={185} height={240} className="relative h-8 w-auto drop-shadow-[0_3px_4px_rgba(24,21,58,0.25)]" draggable={false} />}
              {current && <img src="/game/cat-avatar.webp" alt="" data-cat width={160} height={188} className="relative size-full rounded-full object-cover" draggable={false} />}
              {post.status === "locked" && <span aria-hidden="true" className="relative text-sm font-bold text-brand-lavender-foreground/70 tabular-nums">{index + 1}</span>}
            </span>
            <span className={cn("w-full truncate text-center text-[0.6875rem] sm:text-xs", current ? "font-bold" : "text-muted-foreground")}>
              <span aria-hidden="true">{shortNames[post.stage]}</span>
              <span className="sr-only">Pos {index + 1}, {postNames[post.stage]}: {statusName[post.status]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

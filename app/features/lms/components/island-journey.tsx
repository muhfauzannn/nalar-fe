import { ChevronLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";

import { announcePoints, awardChip, flyCoin, gameGsap, HAPTIC, haptic, playSound, prefersReducedMotion } from "~/features/game-feel";

import { cn } from "~/lib/utils";
import { padPositions, pointCopy, postNames } from "../lib/game";
import type { EarnedPoint, IslandData, WorkflowStage } from "../types";

type Building = IslandData["buildings"][number];

const statusName = { done: "menyala", current: "kamu di sini", locked: "terkunci" } as const;

// Where each pad's name sits relative to the pad, so labels clear the path and
// the hall (the canvas design "3D · Pulau").
const labelPlacement: Record<WorkflowStage, string> = {
  "1_independent_effort": "-translate-x-1/2 translate-y-[1.9rem]",
  "2_guided_questioning": "-translate-x-1/2 translate-y-[1.9rem]",
  "3_ai_evaluation": "-translate-x-1/2 translate-y-[1.7rem]",
  "4_revision_finalization": "-translate-x-full translate-y-[1.7rem]",
  "5_reflection": "-translate-x-[115%] -translate-y-1/2",
};

// One assignment as a path across the island: five stone pads (the five
// stages) that light up as they are completed, the hall at the top, and the
// cat standing on the pad the student is working on now.
export function IslandJourney({
  building,
  backTo,
  onSelectPost,
  subject,
  chest = building.chestOpen ? "open" : "locked",
  onOpenChest,
  lit,
  onLitDone,
  className,
}: {
  building: Building;
  backTo: string;
  onSelectPost: (stage: WorkflowStage) => void;
  /** On phones the island name and progress float next to the back button. */
  subject?: string;
  chest?: "locked" | "ready" | "open";
  onOpenChest?: () => void;
  /** The post that was just completed and the points it earned: played once. */
  lit?: { stage: WorkflowStage; awards: EarnedPoint[] } | null;
  onLitDone?: () => void;
  className?: string;
}) {
  const href = `/assignments/${building.assignmentId}`;
  const current = building.posts.find((post) => post.status === "current");
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const cat = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  // Meso moment "pos menyala": anticipation dip, glow and ring, the crystal
  // drops in, award chips rise, coins fly to the header, the cat hops on.
  useEffect(() => {
    if (!lit || played.current || !root.current) return;
    played.current = true;
    const pad = root.current.querySelector<HTMLElement>(`[data-stage="${lit.stage}"]`);
    if (!pad) return onLitDone?.();
    const gain = lit.awards.reduce((sum, award) => sum + award.points, 0);
    const g = gameGsap();
    if (prefersReducedMotion()) {
      playSound("chord");
      haptic(HAPTIC.award);
      if (gain) announcePoints(gain);
      onLitDone?.();
      return;
    }
    const box = pad.getBoundingClientRect();
    const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const timeline = g.timeline({ onComplete: () => onLitDone?.() });
    timeline
      .from(pad, { scale: 0.86, duration: 0.14, ease: "power2.in" })
      .addLabel("act")
      .add(() => { playSound("chord"); haptic(HAPTIC.award); })
      .fromTo(pad.querySelector("[data-glow]"), { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: "nalar.spring" })
      .fromTo(pad.querySelector("[data-ring]"), { scale: 0.9, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: 0.7, ease: "power2.out" }, "<");
    const crystal = pad.querySelector("[data-crystal]");
    if (crystal) timeline.fromTo(crystal, { y: -36, opacity: 0, scale: 0.6 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "bounce.out" }, "<0.05");
    lit.awards.forEach((award, index) => {
      timeline.add(awardChip({ x: center.x, y: center.y - 34 - index * 30 }, award.points, pointCopy[award.kind].title), `act+=${0.15 + index * 0.18}`);
      timeline.add(flyCoin({ x: center.x, y: center.y - 20 }), `act+=${0.35 + index * 0.15}`);
    });
    if (gain) timeline.add(() => announcePoints(gain), "act+=0.95");
    if (cat.current && current) {
      const from = padPositions[lit.stage], to = padPositions[current.stage];
      timeline
        .add(() => playSound("whoosh"), "act+=1.1")
        .fromTo(cat.current, { left: `${from.x * 100}%`, top: `${from.y * 100}%` }, { left: `${to.x * 100}%`, top: `${to.y * 100}%`, duration: 0.5, ease: "power2.inOut" }, "act+=1.1")
        .fromTo(cat.current, { y: 0 }, { y: -26, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" }, "<");
    } else {
      timeline.to({}, { duration: 0.6 });
    }
  }, [lit, current, onLitDone]);

  return (
    <div
      ref={root}
      className={cn(
        "relative isolate aspect-[2/3] w-full overflow-hidden rounded-[2rem] bg-[#d6ccf4] text-[#18153a]",
        className,
      )}
    >
      <img
        src="/game/island-journey.webp"
        alt={`Pulau dengan lima pos menuju balai ${building.title}`}
        width={768}
        height={1152}
        className="absolute inset-0 size-full select-none object-cover"
        draggable={false}
      />

      <Link
        to={backTo}
        aria-label="Kembali ke pulau"
        className="absolute left-4 top-4 flex size-12 items-center justify-center rounded-2xl bg-white/92 transition-transform duration-150 active:scale-95"
      >
        <ChevronLeft className="size-5" strokeWidth={2.4} />
      </Link>

      <span className="absolute left-[71.8%] top-[3.5%] max-w-[52%] -translate-x-1/2 truncate rounded-xl bg-[#18153a] px-3 py-1.5 text-[0.8125rem] font-semibold text-white max-md:hidden">
        {building.title}
      </span>
      {subject && (
        <div className="absolute left-[4.5rem] right-3 top-4 min-w-0 rounded-2xl bg-white/92 px-3 py-1.5 md:hidden">
          <p className="truncate text-[0.6875rem] text-[#5e5e72]">Pulau {subject}</p>
          <p className="truncate text-sm font-bold">
            {building.title} · {building.posts.filter((post) => post.status === "done").length}/5
          </p>
        </div>
      )}

      {building.posts.map((post, index) => {
        const at = padPositions[post.stage];
        return (
          <button
            key={post.stage}
            type="button"
            data-stage={post.stage}
            data-press
            onClick={() => onSelectPost(post.stage)}
            aria-label={`Pos ${index + 1}, ${postNames[post.stage]}: ${statusName[post.status]}. Lihat rincian pos`}
            className="group absolute block aspect-[2.6/1] cursor-pointer w-[21%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] outline-none focus-visible:ring-3 focus-visible:ring-[#18153a]"
            style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
          >
            <span
              aria-hidden="true"
              data-glow
              className={cn(
                "absolute inset-[10%] rounded-[50%]",
                post.status === "done" &&
                  "bg-[radial-gradient(closest-side,rgb(214_255_238),rgb(75_210_159)_55%,rgb(75_210_159/0.7))] shadow-[0_0_0_3px_rgb(255_255_255/0.85),0_0_30px_10px_rgb(75_210_159/0.7)]",
                post.status === "current" &&
                  "bg-[radial-gradient(closest-side,rgb(255_255_255/0.95),rgb(75_210_159/0.45)_65%,transparent)] shadow-[0_0_0_3px_rgb(75_210_159),0_0_24px_6px_rgb(75_210_159/0.5)] motion-safe:animate-pulse",
                post.status === "locked" &&
                  "bg-[radial-gradient(closest-side,rgb(211_197_248/0.85),rgb(211_197_248/0.45)_65%,transparent)]",
              )}
            />
            <span aria-hidden="true" data-ring className="absolute inset-0 rounded-[50%] border-3 border-white opacity-0" />
            {post.status === "done" && (
              <img
                src="/game/crystal.webp"
                alt=""
                data-crystal
                width={185}
                height={240}
                className="pointer-events-none absolute bottom-[55%] left-1/2 w-[46%] -translate-x-1/2 drop-shadow-[0_6px_8px_rgba(24,21,58,0.25)]"
                draggable={false}
              />
            )}
          </button>
        );
      })}

      {building.posts.map((post, index) => {
        const at = padPositions[post.stage];
        return (
          <span
            key={post.stage}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute whitespace-nowrap rounded-[0.625rem] px-2.5 py-1 text-[0.6875rem] font-semibold sm:text-xs",
              labelPlacement[post.stage],
              post.status === "done" && "bg-white/95",
              post.status === "current" && "bg-[#4bd29f] font-bold text-[#04352a]",
              post.status === "locked" && "bg-[#18153a]/80 text-[#ece7fb]",
            )}
            style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
          >
            {index + 1} · {post.status === "locked" ? "terkunci" : postNames[post.stage]}
            {post.points > 0 && <span className="ml-1.5 text-[#0f6e56]">+{post.points}</span>}
          </span>
        );
      })}

      {current && (
        <span
          ref={cat}
          className="pointer-events-none absolute h-[4.75rem] w-16 -translate-x-[30%] -translate-y-[105%] overflow-hidden rounded-[50%] border-3 border-[#4bd29f] bg-white shadow-lg max-sm:h-16 max-sm:w-[3.4rem]"
          style={{ left: `${padPositions[current.stage].x * 100}%`, top: `${padPositions[current.stage].y * 100}%` }}
        >
          <img src="/game/cat-avatar.webp" alt="Kamu di sini" width={160} height={188} className="size-full scale-110 object-cover" />
        </span>
      )}

      <button
        type="button"
        data-press
        onClick={() => (chest === "open" ? navigate(href) : chest === "ready" ? onOpenChest?.() : onSelectPost("5_reflection"))}
        aria-label={chest === "open" ? "Peti terbuka: lihat laporan reflektifmu" : chest === "ready" ? "Buka peti balai" : "Peti terkunci sampai Pos 5 menyala"}
        className="absolute left-[40%] top-[11%] w-[17%] transition-transform duration-200 hover:-translate-y-1"
      >
        <img
          src={chest === "open" ? "/game/chest.webp" : "/game/chest-closed.webp"}
          alt=""
          width={227}
          height={240}
          className={cn(
            "w-full drop-shadow-[0_6px_10px_rgba(24,21,58,0.35)]",
            chest === "locked" && "opacity-75 grayscale-[0.85]",
            chest === "ready" && "motion-safe:animate-[beckon_1.8s_ease-in-out_infinite]",
          )}
          draggable={false}
        />
        {chest === "ready" && (
          <span className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded-[9px] bg-[#4bd29f] px-2 py-0.5 text-[0.6875rem] font-extrabold text-[#04352a]">
            Buka peti
          </span>
        )}
      </button>
    </div>
  );
}

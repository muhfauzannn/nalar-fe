import { ChevronLeft } from "lucide-react";
import { Link } from "react-router";

import { cn } from "~/lib/utils";
import { padPositions, postNames } from "../lib/game";
import type { IslandData, WorkflowStage } from "../types";

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
  className,
}: {
  building: Building;
  backTo: string;
  onSelectPost: (stage: WorkflowStage) => void;
  className?: string;
}) {
  const href = `/assignments/${building.assignmentId}`;
  const current = building.posts.find((post) => post.status === "current");
  return (
    <div
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
        aria-label="Kembali ke course"
        className="absolute left-4 top-4 flex size-12 items-center justify-center rounded-2xl bg-white/92 transition-transform duration-150 active:scale-95"
      >
        <ChevronLeft className="size-5" strokeWidth={2.4} />
      </Link>

      <span className="absolute left-[71.8%] top-[3.5%] max-w-[52%] -translate-x-1/2 truncate rounded-xl bg-[#18153a] px-3 py-1.5 text-[0.8125rem] font-semibold text-white">
        {building.title}
      </span>

      {building.posts.map((post, index) => {
        const at = padPositions[post.stage];
        return (
          <button
            key={post.stage}
            type="button"
            onClick={() => onSelectPost(post.stage)}
            aria-label={`Pos ${index + 1}, ${postNames[post.stage]}: ${statusName[post.status]}. Lihat rincian pos`}
            className="group absolute block aspect-[2.6/1] cursor-pointer w-[21%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] outline-none focus-visible:ring-3 focus-visible:ring-[#18153a]"
            style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
          >
            <span
              aria-hidden="true"
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
          className="pointer-events-none absolute h-[4.75rem] w-16 -translate-x-[30%] -translate-y-[105%] overflow-hidden rounded-[50%] border-3 border-[#4bd29f] bg-white shadow-lg max-sm:h-16 max-sm:w-[3.4rem]"
          style={{ left: `${padPositions[current.stage].x * 100}%`, top: `${padPositions[current.stage].y * 100}%` }}
        >
          <img src="/game/cat-avatar.webp" alt="Kamu di sini" width={160} height={188} className="size-full scale-110 object-cover" />
        </span>
      )}

      {building.chestOpen && (
        <Link
          to={href}
          aria-label="Peti terbuka: lihat laporan reflektifmu"
          className="absolute left-[40%] top-[12%] w-[17%] transition-transform duration-200 hover:-translate-y-1"
        >
          <img
            src="/game/chest.webp"
            alt=""
            width={227}
            height={240}
            className="w-full drop-shadow-[0_6px_10px_rgba(24,21,58,0.35)]"
            draggable={false}
          />
        </Link>
      )}
    </div>
  );
}

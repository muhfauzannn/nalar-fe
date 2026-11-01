import { Check, LockKeyhole } from "lucide-react";
import { Link } from "react-router";

import { cn } from "~/lib/utils";
import { padPositions, postNames } from "../lib/game";
import type { IslandData } from "../types";

type Building = IslandData["buildings"][number];

const statusName = { done: "menyala", current: "sedang dikerjakan", locked: "terkunci" } as const;

// One assignment as a path across the island: five stone pads (the five stages)
// that light up as the stages are completed, and a chest by the hall that opens
// on the reflective report once the journey is done.
export function IslandJourney({ building, className }: { building: Building; className?: string }) {
  const href = `/assignments/${building.assignmentId}`;
  return (
    <div
      className={cn(
        "relative isolate aspect-[2/3] w-full overflow-hidden rounded-2xl bg-brand-lavender-soft",
        className,
      )}
    >
      <img
        src="/game/island-journey.webp"
        alt=""
        width={768}
        height={1152}
        className="absolute inset-0 size-full select-none object-cover"
        draggable={false}
      />

      {building.posts.map((post, index) => {
        const at = padPositions[post.stage];
        return (
          <Link
            key={post.stage}
            to={href}
            aria-label={`Pos ${index + 1}, ${postNames[post.stage]}: ${statusName[post.status]}`}
            className="group absolute flex aspect-[2.6/1] w-[21%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[50%] outline-none focus-visible:ring-3 focus-visible:ring-ring"
            style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-[8%] rounded-[50%] transition-opacity duration-300",
                post.status === "done" &&
                  "bg-[radial-gradient(closest-side,oklch(0.86_0.15_160/0.95),oklch(0.78_0.16_160/0.55)_60%,transparent)] shadow-[0_0_24px_6px_oklch(0.8_0.16_160/0.55)]",
                post.status === "current" &&
                  "bg-[radial-gradient(closest-side,oklch(0.9_0.13_85/0.9),oklch(0.83_0.15_80/0.45)_60%,transparent)] shadow-[0_0_22px_6px_oklch(0.85_0.15_85/0.5)] motion-safe:animate-pulse",
                post.status === "locked" &&
                  "bg-[radial-gradient(closest-side,oklch(0.82_0.06_295/0.75),oklch(0.82_0.06_295/0.35)_65%,transparent)]",
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                "relative -mt-[18%] flex size-7 items-center justify-center rounded-full font-heading text-xs font-semibold shadow-md ring-2 ring-white/80 transition-transform duration-150 group-hover:-translate-y-0.5 sm:size-8 sm:text-sm",
                post.status === "done" && "bg-brand-mint text-brand-mint-foreground",
                post.status === "current" && "bg-[#f5b83d] text-[#18153a] motion-safe:animate-bounce",
                post.status === "locked" && "bg-white/85 text-[#5d5a83]",
              )}
            >
              {post.status === "done" ? (
                <Check className="size-4" strokeWidth={3} />
              ) : post.status === "locked" ? (
                <LockKeyhole className="size-3.5" />
              ) : (
                index + 1
              )}
            </span>
            {post.points > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-[14%] -top-[30%] rounded-full bg-[#18153a]/85 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white tabular-nums sm:text-xs"
              >
                +{post.points}
              </span>
            )}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-full mt-1 whitespace-nowrap rounded-md bg-[#18153a]/85 px-2 py-0.5 text-[0.6875rem] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {index + 1}. {postNames[post.stage]}
            </span>
          </Link>
        );
      })}

      <Link
        to={href}
        aria-label={building.chestOpen ? "Peti terbuka: lihat laporan reflektifmu" : "Peti terkunci sampai Tahap 5 selesai"}
        className="group absolute left-[40%] top-[12%] w-[17%] outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <img
          src="/game/chest.webp"
          alt=""
          width={227}
          height={240}
          className={cn(
            "w-full drop-shadow-[0_6px_10px_rgba(24,21,58,0.35)] transition-transform duration-200 group-hover:-translate-y-1",
            !building.chestOpen && "opacity-70 grayscale-[0.85]",
          )}
          draggable={false}
        />
        {!building.chestOpen && (
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#5d5a83] shadow"
          >
            <LockKeyhole className="size-3.5" />
          </span>
        )}
      </Link>
    </div>
  );
}

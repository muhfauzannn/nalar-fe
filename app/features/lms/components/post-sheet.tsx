import { Check } from "lucide-react";
import { Link } from "react-router";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "~/components/ui/sheet";
import { cn } from "~/lib/utils";
import { POINT_VALUES, pointCopy, postKinds, postNames } from "../lib/game";
import type { IslandData, WorkflowStage } from "../types";

type Building = IslandData["buildings"][number];

const postGuide: Record<WorkflowStage, string> = {
  "1_independent_effort": "Tulis jawaban awal dengan pikiranmu sendiri, sebelum bertanya ke NALAR.",
  "2_guided_questioning": "Tanya NALAR untuk petunjuk atau menguji cara berpikirmu, bukan meminta jawaban jadi.",
  "3_ai_evaluation": "Periksa jawaban AI: bagian mana yang kurang tepat, belum lengkap, atau perlu dicek?",
  "4_revision_finalization": "Perbaiki drafmu dengan apa yang kamu pelajari sampai isinya benar-benar berubah.",
  "5_reflection": "Ceritakan apa yang berubah dari draf pertamamu dan apa yang akan kamu lakukan lain kali.",
};

// The canvas "Membuka pos": what this post asks for and which Poin Nalar it can
// give, ticked once earned. Opens from a pad on the island or a row in the list.
export function PostSheet({
  building,
  stage,
  href = `/assignments/${building.assignmentId}`,
  onOpenChange,
}: {
  building: Building;
  stage: WorkflowStage | null;
  /** Where the work is done. */
  href?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const index = stage ? building.posts.findIndex((post) => post.stage === stage) : -1;
  const post = index >= 0 ? building.posts[index]! : null;
  const enterable = post && (post.status !== "locked" || (index === 0 && building.open && !building.submissionStatus));

  return (
    <Sheet open={post !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-lg gap-0 overflow-y-auto rounded-t-[1.75rem] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#18153a] [color-scheme:light] sm:p-6"
      >
        {post && stage && (
          <>
            <span aria-hidden="true" className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-[#ece7fb]" />
            <div className="flex items-center gap-3 pr-8">
              <img src="/game/academy.webp" alt="" width={304} height={360} className="h-14 w-auto shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-[0.8125rem] text-[#5e5e72]">
                  Pos {index + 1} · {building.title}
                </p>
                <SheetTitle className="font-heading text-2xl font-bold text-[#18153a]">{postNames[stage]}</SheetTitle>
              </div>
            </div>
            <SheetDescription className="mt-3 text-sm text-[#5e5e72]">{postGuide[stage]}</SheetDescription>

            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-[#5d5a83]">Poin Nalar di pos ini</p>
            <ul className="flex flex-col gap-2">
              {postKinds[stage].map((kind) => {
                const earned = post.earned.includes(kind);
                return (
                  <li
                    key={kind}
                    className={cn(
                      "flex items-center gap-3 rounded-[1.125rem] p-3",
                      earned ? "bg-[#dff7ee]" : "bg-[#f6f3fd]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        earned ? "bg-[#4bd29f] text-[#04352a]" : "border-2 border-[#d3c5f8] bg-white",
                      )}
                    >
                      {earned && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {pointCopy[kind].title}
                        <span className="sr-only">{earned ? ", sudah didapat" : ", belum didapat"}</span>
                      </p>
                      <p className="text-xs text-[#5e5e72]">{pointCopy[kind].detail}</p>
                    </div>
                    <span className={cn("shrink-0 text-sm font-bold tabular-nums", earned ? "text-[#0f6e56]" : "text-[#5d5a83]")}>
                      +{POINT_VALUES[kind]}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex items-center gap-3 rounded-[1.125rem] bg-[#18153a] p-3 text-white">
              <img src="/game/coin.webp" alt="" width={125} height={128} className="size-10 shrink-0" />
              <p className="text-[0.8125rem] text-[#c6c1f1]">
                {post.status === "done"
                  ? `Pos ini sudah menyala${post.points > 0 ? ` dan memberimu ${post.points} Poin Nalar` : ""}.`
                  : `Pos menyala saat kamu menyelesaikannya, dan jalur ke ${index < 4 ? `Pos ${index + 2}` : "peti balai"} terbuka.`}
              </p>
            </div>

            {enterable ? (
              <Link
                to={href}
                className="mt-4 flex min-h-13 items-center justify-center rounded-[1.125rem] bg-[#4bd29f] font-bold text-[#04352a] transition-transform duration-150 active:scale-[0.98]"
              >
                {post.status === "done" ? "Lihat tugas" : post.status === "current" ? "Masuk pos" : "Mulai tugas"}
              </Link>
            ) : (
              <p className="mt-4 text-center text-sm text-[#5d5a83]">Terbuka setelah pos {index} menyala.</p>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

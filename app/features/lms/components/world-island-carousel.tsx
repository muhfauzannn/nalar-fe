import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import type { WorldData } from "../types";
import { moveWorldCarousel, useWorldCarousel } from "../world3d/carousel";

/** One focused island at a time, with keyboard and touch alternatives to swiping. */
export function WorldIslandCarousel({ islands, className }: { islands: WorldData["islands"]; className?: string }) {
  const count = islands.length ? islands.length + 1 : 0;
  const index = useWorldCarousel(count);
  if (!count) return null;
  const island = islands[index];
  return (
    <nav aria-label="Carousel pulau" className={cn("pointer-events-auto flex w-full max-w-[22rem] items-center gap-1 rounded-full bg-white/95 p-1 text-[#18153a] shadow-sm [@media(min-width:768px)_and_(pointer:fine)]:hidden", className)}>
      <span className="sr-only">Geser ke kiri atau kanan untuk berpindah pulau.</span>
      <button type="button" onClick={() => moveWorldCarousel(-1, count)} aria-label="Pulau sebelumnya" className="grid size-11 shrink-0 place-items-center rounded-full active:bg-[#ece7fb]"><ChevronLeft className="size-5" aria-hidden="true" /></button>
      <Link to={island ? `/courses/${island.course.id}` : "/courses/join"} className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center px-2 text-center" aria-label={island ? `Buka pulau ${island.course.subjectName}, ${island.course.name}` : "Gabung course baru"}>
        <span className="max-w-full truncate text-sm font-semibold">{island ? `Pulau ${island.course.subjectName}` : "Gabung course"}</span>
        <span className="max-w-full truncate text-xs tabular-nums text-[#5e5e72]" aria-live="polite">{island ? `${island.course.name} · ` : ""}{index + 1} / {count}</span>
      </Link>
      <button type="button" onClick={() => moveWorldCarousel(1, count)} aria-label="Pulau berikutnya" className="grid size-11 shrink-0 place-items-center rounded-full active:bg-[#ece7fb]"><ChevronRight className="size-5" aria-hidden="true" /></button>
    </nav>
  );
}

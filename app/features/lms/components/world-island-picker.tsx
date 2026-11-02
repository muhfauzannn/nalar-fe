import { Link } from "react-router";
import { cn } from "~/lib/utils";
import type { WorldData } from "../types";

/** A touch-friendly route to every enrolled course, including off-screen islands. */
export function WorldIslandPicker({
  islands,
  className,
}: {
  islands: WorldData["islands"];
  className?: string;
}) {
  if (!islands.length) return null;
  return (
    <nav
      aria-label="Pilih pulau"
      className={cn(
        "pointer-events-auto w-full max-w-[26rem] rounded-[22px] bg-white p-2.5 text-[#18153a] shadow-[0_12px_30px_-10px_rgba(24,21,58,.35)] [@media(min-width:768px)_and_(pointer:fine)]:hidden",
        className,
      )}
    >
      <p className="px-1 pb-1.5 text-xs font-semibold text-[#5e5e72]">
        Pilih pulau
      </p>
      <div className="flex snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain pb-1 [touch-action:pan-x]">
        {islands.map(({ course }) => (
          <Link
            key={course.id}
            to={`/courses/${course.id}`}
            aria-label={`Buka pulau ${course.subjectName}, ${course.name}`}
            className="flex min-h-11 w-40 shrink-0 snap-start flex-col justify-center rounded-xl border border-[#e4def8] bg-[#f6f3fd] px-3 py-1.5 text-left transition-transform duration-150 active:scale-[0.97]"
          >
            <span className="truncate text-sm font-semibold">
              {course.subjectName}
            </span>
            <span className="truncate text-xs text-[#5e5e72]">
              {course.name}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

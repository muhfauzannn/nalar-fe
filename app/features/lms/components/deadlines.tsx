import { BookOpen, ChevronRight, ClipboardCheck, X } from "lucide-react";
import { useId } from "react";
import { Link } from "react-router";

import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "~/components/ui/drawer";
import { cn } from "~/lib/utils";

import { useNow } from "../hooks/use-now";
import type { UpcomingWork } from "../types";
import { deadlineHref, dueText, splitDeadlines, URGENT_HOURS } from "../world3d/deadlines";

/** "Pulau Fisika" for a course the student has an island for, else the course's own name. */
export type IslandNames = Map<string, string>;

function Row({ item, now, world3d, islands, compact, onPick }: { item: UpcomingWork; now: number; world3d: boolean; islands: IslandNames; compact: boolean; onPick?: () => void }) {
  const { tone, text } = dueText(item.dueAt, now);
  const urgent = tone !== "later";
  const Icon = item.type === "quiz" ? ClipboardCheck : BookOpen;
  return (
    <Link
      to={deadlineHref(item, world3d)}
      onClick={onPick}
      data-testid="deadline"
      data-tone={tone}
      className={cn(
        "flex w-full items-center gap-3 rounded-[18px] text-left outline-none transition-transform duration-150 focus-visible:ring-3 focus-visible:ring-[#4bd29f] active:scale-[0.985]",
        compact ? "min-h-[72px] rounded-2xl px-3 py-2.5" : "min-h-[76px] p-3",
        urgent ? "bg-[#fdf1d8]" : "bg-[#f6f3fd]",
      )}
    >
      <span aria-hidden="true" className={cn("grid shrink-0 place-items-center bg-white", compact ? "size-10 rounded-xl" : "size-11 rounded-[14px]", urgent ? "text-[#855a00]" : "text-[#18153a]")}>
        <Icon className={compact ? "size-5" : "size-[22px]"} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("font-semibold leading-snug text-[#18153a]", compact ? "text-sm" : "text-[15px]")}>{item.title}</span>
        <span className="text-xs text-[#5e5e72]">
          {islands.get(item.courseId) ?? item.courseName} · {item.type === "quiz" ? "Kuis" : "Tugas NALAR"}
        </span>
        <span className={cn("text-xs font-semibold", urgent ? "text-[#855a00]" : "text-[#5e5e72]")}>{text}</span>
      </span>
      <ChevronRight aria-hidden="true" className={cn("size-5 shrink-0", urgent ? "text-[#855a00]" : "text-[#5e5e72]")} />
    </Link>
  );
}

/**
 * The open work with a due date, the urgent group first. Each row leads to its
 * place: in the 3D world the camera flies there, in the 2D world it is a page.
 */
export function DeadlineList({ items, world3d, islands, compact = false, onPick }: { items: UpcomingWork[]; world3d: boolean; islands: IslandNames; compact?: boolean; onPick?: () => void }) {
  const now = useNow();
  const id = useId();
  const { soon, later } = splitDeadlines(items, now);
  const groups = [
    { key: "soon", title: `Segera · dalam ${URGENT_HOURS} jam`, tone: "text-[#855a00]", items: soon },
    { key: "later", title: "Berikutnya", tone: "text-[#5e5e72]", items: later },
  ].filter((group) => group.items.length > 0);
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`${id}-${group.key}`} className="flex flex-col gap-2">
          <h3 id={`${id}-${group.key}`} className={cn("text-xs font-semibold uppercase tracking-wider", group.tone)}>
            {group.title}
          </h3>
          {group.items.map((item) => (
            <Row key={`${item.type}-${item.id}`} item={item} now={now} world3d={world3d} islands={islands} compact={compact} onPick={onPick} />
          ))}
        </section>
      ))}
    </div>
  );
}

// "Tenggat" as a sheet over the world on a phone, like "Gabung ke course": it
// rises from the bottom and a swipe down puts it away.
export function DeadlineSheet({ open, onOpenChange, items, world3d, islands }: { open: boolean; onOpenChange: (open: boolean) => void; items: UpcomingWork[]; world3d: boolean; islands: IslandNames }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg bg-white p-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-[#18153a] [color-scheme:light] data-[swipe-direction=down]:rounded-t-[1.75rem] data-[swipe-direction=down]:border-t-0 sm:p-6">
        <span aria-hidden="true" className="mx-auto mb-4 h-1.5 w-11 shrink-0 rounded-full bg-[#d3c5f8]" />
        <div className="-mx-1 min-h-0 overflow-y-auto overscroll-contain px-1">
          <div className="pr-10">
            <DrawerTitle className="font-heading text-2xl font-bold text-[#18153a]">Tenggat</DrawerTitle>
            <DrawerDescription className="text-[#5e5e72]">
              {items.length} yang perlu kamu selesaikan. Ketuk satu untuk terbang ke tempatnya.
            </DrawerDescription>
          </div>
          <div className="mt-5">
            <DeadlineList items={items} world3d={world3d} islands={islands} onPick={() => onOpenChange(false)} />
          </div>
        </div>
        <DrawerClose aria-label="Tutup" className="absolute right-3 top-3 grid size-11 place-items-center rounded-full hover:bg-[#f6f3fd]">
          <X className="size-5" aria-hidden="true" />
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}

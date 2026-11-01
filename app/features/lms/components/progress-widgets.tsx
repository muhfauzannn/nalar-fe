import { Check, Flame } from "lucide-react";
import { useEffect, useState } from "react";

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { lastSeenLevel, markLevelSeen, missionCopy, weekdayShort } from "../lib/game";
import type { PointsData } from "../types";

// Shared pieces of the canvas "Dashboard siswa" and "Dunia": the level ring,
// the weekly target, missions and the level-up moment. Everything shown here
// comes from Poin Nalar and completed stages, never the AI Offloading Index.

export function LevelRing({ level, size = 112, className }: { level: PointsData["level"]; size?: number; className?: string }) {
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const share = level.needed === 0 ? 0 : level.into / level.needed;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="#ffffff" stroke="#d3c5f8" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#4bd29f"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0.001, share) * circumference} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#18153a]">
        <span className="text-[0.6875rem] font-medium leading-none text-[#5e5e72]">Level</span>
        <span className="font-heading font-bold leading-none tabular-nums" style={{ fontSize: size * 0.32 }}>
          {level.level}
        </span>
      </div>
    </div>
  );
}

export function LevelBar({ level, className }: { level: PointsData["level"]; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label={`Menuju Level ${level.level + 1}`}
      aria-valuemin={0}
      aria-valuemax={level.needed}
      aria-valuenow={level.into}
      className={cn("h-2.5 overflow-hidden rounded-full bg-white/20", className)}
    >
      <div className="h-full rounded-full bg-[#4bd29f]" style={{ width: `${(level.into / level.needed) * 100}%` }} />
    </div>
  );
}

// Seven days, Monday first, with the days a stage was completed ticked.
export function WeekTarget({ week, tone = "dark" }: { week: PointsData["week"]; tone?: "dark" | "light" }) {
  const done = week.activeDays.length;
  const left = Math.max(0, week.target - done);
  return (
    <div className="flex flex-col gap-2.5">
      <p className={cn("flex items-center gap-1.5 text-sm font-medium", tone === "dark" ? "text-white/80" : "text-muted-foreground")}>
        <Flame className="size-4 text-[#f5b83d]" aria-hidden="true" />
        Target minggu ini · {week.target} hari
      </p>
      <ol className="flex gap-1.5">
        {weekdayShort.map((day, index) => {
          const active = week.activeDays.includes(index);
          return (
            <li key={day} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  active ? "bg-[#4bd29f] text-[#04352a]" : tone === "dark" ? "bg-white/15" : "bg-muted",
                )}
              >
                {active && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
              </span>
              <span className={cn("text-[0.625rem]", tone === "dark" ? "text-white/60" : "text-muted-foreground")}>
                {day}
                <span className="sr-only">{active ? ", ada tahap selesai" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className={cn("text-xs", tone === "dark" ? "text-white/70" : "text-muted-foreground")}>
        {left === 0
          ? week.streakWeeks > 1
            ? `Tercapai. Minggu ke-${week.streakWeeks} berturut-turut.`
            : "Target minggu ini tercapai."
          : `${left} hari lagi · sisa ${week.daysLeft + 1} hari minggu ini`}
      </p>
    </div>
  );
}

export function StreakChip({ weeks, className }: { weeks: number; className?: string }) {
  if (weeks === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-[#fdf1d8] px-3 py-1 text-sm font-semibold text-[#855a00]", className)}>
      <Flame className="size-4 fill-[#fdf1d8] text-[#c98a12]" aria-hidden="true" />
      Minggu ke-{weeks}
    </span>
  );
}

export function Missions({ missions, className }: { missions: PointsData["missions"]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {missions.map((mission) => {
        const done = mission.progress >= mission.target;
        return (
          <li key={mission.id} className="flex flex-col gap-1.5">
            <p className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn(done && "text-muted-foreground line-through decoration-[#4bd29f] decoration-2")}>
                {missionCopy[mission.id]}
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums">
                {mission.progress}/{mission.target}
              </span>
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-full rounded-full bg-[#4bd29f] transition-[width] duration-500"
                style={{ width: `${(mission.progress / mission.target) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// The canvas "Naik level" moment, shown once per new level. The first visit
// only records the level, so nobody is greeted with a level-up for old work.
export function LevelUpMoment({ userId, points }: { userId: string; points: PointsData }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const seen = lastSeenLevel(userId);
    if (seen !== null && points.level.level > seen) setOpen(true);
    else markLevelSeen(userId, points.level.level);
  }, [userId, points.level.level]);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) markLevelSeen(userId, points.level.level);
  };
  const earned = points.badges.filter((badge) => badge.earned).length;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden bg-[#18153a] p-0 text-center text-white ring-0 sm:max-w-sm"
      >
        <div className="relative flex flex-col items-center gap-3 px-6 pb-6 pt-8">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(closest-side,rgb(75_210_159/0.35),transparent)]" />
          <p className="relative text-sm font-medium text-[#c6c1f1]">Kamu naik level</p>
          <img src="/game/cat-celebrate.webp" alt="" width={320} height={318} className="relative size-40 motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:duration-500" />
          <span className="relative rounded-full bg-[#4bd29f] px-4 py-1 font-heading text-sm font-bold text-[#04352a]">
            Level {points.level.level}
          </span>
          <DialogTitle className="relative font-heading text-2xl font-bold text-white">{points.level.title}</DialogTitle>
          <DialogDescription className="relative text-sm text-[#c6c1f1]">
            Poin datang dari cara kerjamu: draf sendiri, pertanyaan yang baik, revisi yang sungguh-sungguh.
          </DialogDescription>
          <div className="relative mt-1 grid w-full grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="font-heading text-xl font-bold tabular-nums">{points.total}</p>
              <p className="text-xs text-[#c6c1f1]">Poin Nalar total</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="font-heading text-xl font-bold tabular-nums">{earned}</p>
              <p className="text-xs text-[#c6c1f1]">Lencana didapat</p>
            </div>
          </div>
          <DialogClose className="relative mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#4bd29f] font-bold text-[#04352a] transition-transform duration-150 active:scale-[0.98]">
            Mantap, lanjut
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

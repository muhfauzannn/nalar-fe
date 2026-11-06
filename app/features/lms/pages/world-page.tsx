import { ChevronRight, List, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";

import { finished, gameGsap, gameToast, playSound, prefersReducedMotion } from "~/features/game-feel";

import { cn } from "~/lib/utils";
import { DeadlineList } from "../components/deadlines";
import { LevelBar, LevelUpMoment, Missions, StreakChip } from "../components/progress-widgets";
import { useStudentId } from "../hooks/use-student-id";
import { WorldIslandCarousel } from "../components/world-island-carousel";
import { useWorldCarousel, useWorldSwipe } from "../world3d/carousel";
import { missionCopy, postNames } from "../lib/game";
import { missionsJustDone } from "../components/game-moments";
import type { WorldData } from "../types";
import { usePageReady } from "~/features/loading/context";

type Island = WorldData["islands"][number];

// Where each island's sign sits on /game/world-map.webp (share of width and
// height), for the three islands that hold courses. The misty fourth island
// invites the student to join another course.
// `x`/`y` are on the landscape art, `mx`/`my` on the portrait art phones get.
const anchors = [
  { x: 0.33, y: 0.2, mx: 0.3, my: 0.3 },
  { x: 0.68, y: 0.06, mx: 0.74, my: 0.41 },
  { x: 0.8, y: 0.46, mx: 0.7, my: 0.74 },
];
const misty = { x: 0.17, y: 0.3, mx: 0.2, my: 0.27 };

const at = (anchor: { x: number; y: number; mx: number; my: number }) =>
  ({
    "--x": `${anchor.x * 100}%`,
    "--y": `${anchor.y * 100}%`,
    "--mx": `${anchor.mx * 100}%`,
    "--my": `${anchor.my * 100}%`,
  }) as React.CSSProperties;
const placed = "left-[var(--mx)] top-[var(--my)] md:left-[var(--x)] md:top-[var(--y)]";

// The canvas "3D · Peta dunia": every course is a floating island, with the
// student's level, Poin Nalar and weekly streak above and where they left off
// below. Nothing on it comes from the AI Offloading Index.
export function WorldPage({ data, name }: { data: WorldData; name: string }) {
  const studentId = useStudentId();
  const ready = usePageReady();
  const count = data.islands.length ? data.islands.length + 1 : 0;
  const selectedIndex = useWorldCarousel(count);
  const swipe = useWorldSwipe(true, count);
  const selectedIsland = data.islands[selectedIndex];
  const shown = data.islands.slice(0, anchors.length);
  const more = data.islands.slice(anchors.length);
  const active = data.islands.find((island) => island.current?.post) ?? data.islands.find((island) => island.current) ?? null;
  const mission = data.missions.find((item) => item.progress < item.target) ?? null;
  const navigate = useNavigate();
  const map = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready || !studentId) return;
    missionsJustDone(studentId, data.missions).forEach((item, index) =>
      window.setTimeout(
        () => gameToast({ title: "Misi selesai", sub: missionCopy[item.id], points: `${item.target}/${item.target}`, sound: "ding" }),
        600 + index * 900,
      ),
    );
  }, [ready, studentId, data.missions]);

  // Meso "terbang": the map zooms toward the island before the island opens.
  function flyTo(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (prefersReducedMotion() || !map.current || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    const box = map.current.getBoundingClientRect(), from = event.currentTarget.getBoundingClientRect();
    const origin = `${((from.left + from.width / 2 - box.left) / box.width) * 100}% ${((from.top + from.height - box.top) / box.height) * 100}%`;
    playSound("whoosh");
    const g = gameGsap();
    void finished(g.timeline().to(map.current, { scale: 2.4, opacity: 0.2, transformOrigin: origin, duration: 0.6, ease: "power3.in" })).then(() => navigate(href));
  }

  return (
    <div className="flex flex-col gap-4 text-[#18153a] [color-scheme:light] max-md:-mx-4 max-md:-mt-8 sm:max-md:-mx-6">
      {studentId && <LevelUpMoment userId={studentId} points={data} />}

      <div {...swipe} className="relative isolate overflow-hidden bg-[#d6ccf4] max-md:[touch-action:pan-y] md:rounded-[2rem] [@media(pointer:coarse)]:[touch-action:pan-y]">
        <div ref={map}>
        <picture>
          <source media="(max-width: 767px)" srcSet="/game/world-map-portrait.webp" width={768} height={1152} />
          <img
            src="/game/world-map.webp"
            alt="Dunia Bernalar: kelas-kelas melayang, satu untuk setiap course"
            width={1440}
            height={960}
            className="block aspect-[2/3] w-full select-none object-cover md:aspect-[3/2]"
            draggable={false}
          />
        </picture>
        </div>

        <header className="absolute inset-x-3 top-3 flex items-center gap-2 sm:inset-x-4 sm:top-4 md:flex-wrap">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/92 py-2 pl-2 pr-4 shadow-sm max-md:flex-1">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#18153a] font-heading font-bold text-white">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {name.split(/\s+/)[0]} · Level {data.level.level}
              </p>
              <LevelBar level={data.level} className="mt-1 h-1.5 w-full max-w-28 bg-[#ece7fb]" />
            </div>
          </div>
          <span className="inline-flex h-14 shrink-0 items-center gap-2 rounded-2xl bg-white/92 pl-2 pr-4 font-heading font-semibold shadow-sm md:h-12">
            <img src="/game/coin.webp" alt="" width={125} height={128} className="size-8" />
            <span className="tabular-nums">{data.total.toLocaleString("id-ID")}</span>
            <span className="sr-only">Poin Nalar</span>
          </span>
          <StreakChip weeks={data.week.streakWeeks} className="h-12 rounded-2xl max-md:hidden" />
        </header>

        {shown.map((island, index) => (
          <IslandSign key={island.course.id} island={island} anchor={anchors[index]!} highlighted={island === active} onFly={flyTo} className="hidden [@media(min-width:768px)_and_(pointer:fine)]:block" />
        ))}

        {selectedIsland && <IslandSign island={selectedIsland} anchor={{ x: 0.5, y: 0.38, mx: 0.5, my: 0.38 }} highlighted={selectedIsland === active} onFly={flyTo} className="[@media(min-width:768px)_and_(pointer:fine)]:hidden" />}
        {count > 0 && !selectedIsland && (
          <Link to="/courses/join" className="absolute left-1/2 top-[38%] -translate-x-1/2 rounded-2xl bg-[#18153a]/90 px-4 py-3 text-sm font-semibold text-white [@media(min-width:768px)_and_(pointer:fine)]:hidden">Gabung course</Link>
        )}
        <WorldIslandCarousel islands={data.islands} className="absolute bottom-20 left-1/2 w-[calc(100%-1.5rem)] -translate-x-1/2" />

        <Link
          to="/courses/join"
          className={cn(
            "absolute hidden -translate-x-1/2 rounded-2xl bg-[#18153a]/80 px-3.5 py-2 text-[#ece7fb] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97] xl:block",
            placed,
          )}
          style={at(misty)}
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Plus className="size-4" aria-hidden="true" />
            Kelas berikutnya
          </span>
          <span className="text-xs opacity-80 max-md:hidden">Gabung course lain</span>
        </Link>

        <aside className="absolute bottom-4 right-4 hidden w-[22rem] flex-col gap-3 xl:flex">
          <Journey island={active} onFly={flyTo} />
          {mission && <MissionStrip mission={mission} />}
          {active && <Bridge island={active} />}
        </aside>
      </div>

      <div className="grid items-start gap-3 max-md:relative max-md:z-10 max-md:-mt-16 max-md:px-3 md:grid-cols-2 xl:hidden">
        <Journey island={active} onFly={flyTo} />
        <div className="rounded-[1.5rem] bg-card p-4 text-card-foreground shadow-card ring-1 ring-border">
          <p className="mb-3 font-heading font-semibold">Misi minggu ini</p>
          <Missions missions={data.missions} />
        </div>
        {active && <Bridge island={active} />}
      </div>

      {data.upcoming && data.upcoming.length > 0 && (
        <section aria-labelledby="tenggat-title" className="rounded-[1.5rem] bg-card p-4 text-card-foreground shadow-card ring-1 ring-border max-md:mx-3">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="tenggat-title" className="font-heading font-semibold">Tenggat</h2>
            <span className="text-xs text-muted-foreground">{data.upcoming.length} perlu diselesaikan</span>
          </div>
          <DeadlineList items={data.upcoming} world3d={false} islands={new Map(data.islands.map((item) => [item.course.id, `Kelas ${item.course.subjectName}`]))} />
        </section>
      )}

      <section aria-label="Kelas lainnya" className="flex flex-wrap items-center gap-2 max-md:px-3">
          {more.map((island) => (
            <Link
              key={island.course.id}
              to={`/courses/${island.course.id}`}
              className="hidden items-center gap-2 rounded-2xl bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground shadow-card ring-1 ring-border [@media(min-width:768px)_and_(pointer:fine)]:flex"
            >
              Kelas {island.course.subjectName}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ))}
          {data.islands.length === 0 && (
            <p className="w-full text-sm text-muted-foreground">
              Belum ada kelas. Gabung course dengan kode dari gurumu untuk membuka kelas pertamamu.
            </p>
          )}
          <Link
            to="/courses/join"
            className="flex items-center gap-2 rounded-2xl bg-[#18153a] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="size-4" aria-hidden="true" />
            Gabung course
          </Link>
          <Link
            to="/courses"
            className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-border hover:bg-muted"
          >
            <List className="size-4" aria-hidden="true" />
            Tampilan daftar
          </Link>
        </section>
    </div>
  );
}

type Fly = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => void;

function IslandSign({
  island,
  anchor,
  highlighted,
  onFly,
  className,
}: {
  island: Island;
  anchor: (typeof anchors)[number];
  highlighted: boolean;
  onFly: Fly;
  className?: string;
}) {
  const current = island.current;
  const lit = current?.postsDone ?? 0;
  return (
    <Link
      to={`/courses/${island.course.id}`}
      data-press
      onClick={(event) => onFly(event, `/courses/${island.course.id}`)}
      className={cn(
        "absolute max-w-[46%] -translate-x-1/2 rounded-2xl px-3 py-1.5 shadow-md max-md:max-w-[40%] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97] sm:max-w-[16rem] sm:px-4 sm:py-2.5",
        placed,
        highlighted ? "bg-[#18153a] text-white" : "bg-white/95",
        className,
      )}
      style={at(anchor)}
    >
      {highlighted && <p className="text-[0.6875rem] text-[#c6c1f1] max-md:hidden">Sedang dijelajahi</p>}
      <p className="truncate font-heading text-sm font-bold sm:text-base">Kelas {island.course.subjectName}</p>
      {current ? (
        <>
          <div className="my-1.5 flex gap-1 max-sm:hidden" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "h-1.5 w-6 rounded-full",
                  index < lit ? "bg-[#4bd29f]" : highlighted ? "bg-white/25" : "bg-[#ece7fb]",
                )}
              />
            ))}
          </div>
          <p className={cn("truncate text-xs", highlighted ? "text-[#c6c1f1]" : "text-[#5e5e72]")}>
            <span className="max-md:hidden">{current.title} · </span>
            {lit}/5 pos
          </p>
        </>
      ) : (
        <p className={cn("text-xs", highlighted ? "text-[#c6c1f1]" : "text-[#5e5e72]")}>
          {island.halls === 0 ? "Belum ada balai" : `${island.hallsDone}/${island.halls} balai tuntas`}
        </p>
      )}
    </Link>
  );
}

function Journey({ island, onFly }: { island: Island | null; onFly: Fly }) {
  const current = island?.current ?? null;
  return (
    <div className="flex items-center gap-3 rounded-[1.5rem] bg-white p-3.5 text-[#18153a] shadow-md">
      <span className="size-14 shrink-0 overflow-hidden rounded-2xl bg-[#dff7ee]">
        <img src="/game/cat-avatar.webp" alt="" width={160} height={188} className="size-full object-cover" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#5e5e72]">{current ? "Lanjutkan perjalanan" : "Semua balai tuntas"}</p>
        <p className="truncate font-semibold">
          {current?.post
            ? `Pos ${current.post.index} · ${postNames[current.post.stage]}`
            : current
              ? `Masuk balai ${current.title}`
              : "Tunggu tugas berikutnya dari gurumu"}
        </p>
      </div>
      {current && island && (
        <Link
          to={`/courses/${island.course.id}/balai/${current.assignmentId}`}
          data-press
          onClick={(event) => onFly(event, `/courses/${island.course.id}/balai/${current.assignmentId}`)}
          className="flex h-11 shrink-0 items-center rounded-xl bg-[#4bd29f] px-4 text-sm font-bold text-[#04352a] transition-transform duration-150 active:scale-[0.97]"
        >
          Masuk
        </Link>
      )}
    </div>
  );
}

function MissionStrip({ mission }: { mission: WorldData["missions"][number] }) {
  return (
    <div className="rounded-[1.25rem] bg-white/92 px-4 py-3 shadow-sm">
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">Misi: {missionCopy[mission.id]}</span>
        <span className="text-xs font-semibold tabular-nums">
          {mission.progress}/{mission.target}
        </span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ece7fb]" aria-hidden="true">
        <div className="h-full rounded-full bg-[#4bd29f]" style={{ width: `${(mission.progress / mission.target) * 100}%` }} />
      </div>
    </div>
  );
}

// A class target: one plank per finished journey, nobody named or ranked.
function Bridge({ island }: { island: Island }) {
  const { planks, total } = island.bridge;
  return (
    <div className="rounded-[1.25rem] bg-white/92 px-4 py-3 text-[#18153a] shadow-sm ring-1 ring-black/5">
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">Jembatan kelas {island.course.name}</span>
        <span className="text-xs font-semibold tabular-nums">
          {planks}/{total}
        </span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ece7fb]" aria-hidden="true">
        <div className="h-full rounded-full bg-[#4bd29f]" style={{ width: `${total ? (planks / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

import { ChevronLeft, ChevronRight, Flag, List, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";

import { gameToast } from "~/features/game-feel";
import { http } from "~/lib/http";
import { cn } from "~/lib/utils";
import { usePageReady } from "~/features/loading/context";

import { BadgeMoment, ChestMoment, chestSeen, markBadgeSeen, markChestSeen, missionsJustDone, newBadges } from "../components/game-moments";
import { JoinCourseSheet } from "../components/join-course-sheet";
import { PostSheet } from "../components/post-sheet";
import { WorldIslandCarousel } from "../components/world-island-carousel";
import { LevelBar, LevelUpMoment, Missions, WeekTarget } from "../components/progress-widgets";
import { useStudentId } from "../hooks/use-student-id";
import { districtsOf, type Stop } from "../lib/districts";
import { missionCopy, postNames } from "../lib/game";
import type { BadgeProgress, CourseData, EarnedPoint, IslandData, PointsData, WorkflowStage, WorldData } from "../types";
import { classroomUrl } from "./classroom-focus";
import { useJoinSheet } from "./join";
import { useWorldOverlay } from "./mode";
import { useStageScene, type ChestState } from "./store";

// The buttons and cards over the 3D world. Each world route renders one of
// these instead of its 2D page; it puts its data on stage and draws its dock
// into the overlay layer the student shell keeps above the canvas.

export function Overlay({ children }: { children: ReactNode }) {
  const host = useWorldOverlay();
  return host ? createPortal(<div className="contents text-[#18153a] [color-scheme:light]">{children}</div>, host) : null;
}

export const card = "pointer-events-auto rounded-[22px] bg-white shadow-[0_12px_30px_-10px_rgba(24,21,58,.35)]";
export const press = "transition-transform duration-150 active:scale-[0.97]";

export function TopBar({ back, backLabel, crumbs, reserveRight = false }: { back?: string; backLabel?: string; crumbs: { label: string; to?: string }[]; reserveRight?: boolean }) {
  return (
    <div className={cn("absolute left-3 right-3 top-3 z-20 flex items-center gap-2 sm:left-4 sm:top-4", reserveRight && "pr-[86px] sm:pr-[96px]")}>
      {back && (
        <Link to={back} aria-label={backLabel ?? "Kembali"} className={cn("pointer-events-auto flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-white/93 px-3 shadow-sm", press)}>
          <ChevronLeft className="size-5" aria-hidden="true" />
          {backLabel && <span className="text-sm font-semibold max-sm:sr-only">{backLabel}</span>}
        </Link>
      )}
      <nav aria-label="Lokasi" className="pointer-events-auto flex min-w-0 items-center gap-0.5 rounded-[14px] bg-white/90 px-2.5 py-1.5 text-[13px] shadow-sm">
        {crumbs.map((crumb, index) => (
          <span key={crumb.label} className="flex min-w-0 items-center gap-0.5">
            {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-[#5d5a83]" aria-hidden="true" />}
            {crumb.to ? (
              <Link to={crumb.to} className="truncate rounded-md px-1.5 py-1 text-[#5e5e72] hover:text-[#18153a]">{crumb.label}</Link>
            ) : (
              <b className="truncate px-1.5 py-1">{crumb.label}</b>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}

export function Dock({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("absolute inset-x-3 bottom-4 flex flex-col items-center gap-2 sm:bottom-6", className)}>{children}</div>;
}

// ---- Dunia ---------------------------------------------------------------------------

export function WorldOverlay({ data, name }: { data: WorldData; name: string }) {
  const studentId = useStudentId();
  const ready = usePageReady();
  const [missionsOpen, setMissionsOpen] = useState(false);
  const join = useJoinSheet();
  useStageScene({ world: data, shot: { kind: "world" } }, [data]);
  useEffect(() => {
    if (!ready || !studentId) return;
    missionsJustDone(studentId, data.missions).forEach((item, index) =>
      window.setTimeout(() => gameToast({ title: "Misi selesai", sub: missionCopy[item.id], points: `${item.target}/${item.target}`, sound: "ding" }), 600 + index * 900),
    );
  }, [ready, studentId, data.missions]);
  // With every hall finished there is no current post, but the island is still there to visit.
  const active = data.islands.find((island) => island.current?.post) ?? data.islands.find((island) => island.current) ?? data.islands[0] ?? null;
  const current = active?.current ?? null;
  const href = active ? (current ? `/courses/${active.course.id}/balai/${current.assignmentId}` : `/courses/${active.course.id}`) : null;
  return (
    <Overlay>
      {studentId && <LevelUpMoment userId={studentId} points={data} />}
      <div className="absolute left-3 top-3 flex flex-col items-start gap-2 sm:left-4 sm:top-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-white/93 py-2 pl-2 pr-4 shadow-sm">
          <span className="grid size-10 place-items-center rounded-xl bg-[#18153a] font-heading font-bold text-white">{name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{name.split(/\s+/)[0]} · Level {data.level.level}</p>
            <LevelBar level={data.level} className="mt-1 h-1.5 w-28 bg-[#ece7fb]" />
          </div>
        </div>
        <button type="button" aria-expanded={missionsOpen} onClick={() => setMissionsOpen((open) => !open)} className={cn("pointer-events-auto inline-flex items-center gap-2 rounded-2xl bg-white/93 px-3.5 py-2 text-sm font-semibold shadow-sm", press)}>
          <Flag className="size-4" aria-hidden="true" />
          Misi minggu ini · {data.missions.filter((m) => m.progress >= m.target).length}/{data.missions.length}
        </button>
        {missionsOpen && (
          <div className={cn(card, "flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-4 p-4")}>
            <WeekTarget week={data.week} tone="light" />
            <Missions missions={data.missions} />
          </div>
        )}
      </div>
      <Dock>
        <WorldIslandCarousel islands={data.islands} onJoin={() => join.open()} />
        <div className={cn(card, "flex w-full max-w-[26rem] items-center gap-3 p-3")}>
          <img src="/game/cat-avatar.webp" alt="" className="size-12 shrink-0 rounded-2xl bg-[#dff7ee] object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#5e5e72]">{!active ? "Belum ada pulau" : current ? "Lanjutkan perjalanan" : "Semua balai tuntas"}</p>
            <p className="truncate text-[15px] font-bold">
              {current?.post ? `Pos ${current.post.index} · ${postNames[current.post.stage]}` : current ? current.title : active ? `Pulau ${active.course.subjectName}` : "Gabung course dari gurumu"}
            </p>
          </div>
          {href ? (
            <Link to={href} data-press className="shrink-0 rounded-[14px] bg-[#4bd29f] px-4 py-3 text-sm font-bold text-[#04352a]">
              Terbang
            </Link>
          ) : (
            <button type="button" data-press onClick={() => join.open()} className="shrink-0 rounded-[14px] bg-[#4bd29f] px-4 py-3 text-sm font-bold text-[#04352a]">
              Gabung
            </button>
          )}
        </div>
        <Link to="/courses" className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold shadow-sm">
          <List className="size-3.5" aria-hidden="true" />
          Tampilan daftar
        </Link>
      </Dock>
      <JoinCourseSheet open={join.sheet !== null} code={join.sheet?.code ?? ""} onClose={join.close} />
    </Overlay>
  );
}

// ---- Pulau ---------------------------------------------------------------------------

const placeName = { library: "Perpustakaan", lab: "Lab", arena: "Arena latihan" } as const;
type PlaceKey = keyof typeof placeName;

export function IslandOverlay({ course, island }: { course: CourseData; island: IslandData }) {
  const [params] = useSearchParams();
  const place = params.get("tempat") as PlaceKey | null;
  const courseId = course.course.id;
  const stops = useMemo(() => districtsOf(course, island).flatMap((district) => district.stops), [course, island]);
  const valid = place && place in placeName && stops.some((stop) => stop.place === place) ? place : null;
  useStageScene(
    { detail: { course, island }, shot: valid ? { kind: "place", courseId, place: valid } : { kind: "island", courseId } },
    [course, island, valid],
  );
  const halls = stops.filter((stop) => stop.place === "hall");
  const placesHere = (Object.keys(placeName) as PlaceKey[]).filter((key) => stops.some((stop) => stop.place === key));
  return (
    <Overlay>
      <TopBar back={valid ? `/courses/${courseId}` : "/dunia"} crumbs={[{ label: "Dunia", to: "/dunia" }, valid ? { label: `Pulau ${course.course.subjectName}`, to: `/courses/${courseId}` } : { label: `Pulau ${course.course.subjectName}` }, ...(valid ? [{ label: placeName[valid] }] : [])]} />
      <Dock>
        {valid ? (
          <PlaceCard
            title={placeName[valid]}
            // The library opens into the classroom: each lesson goes on its blackboard.
            stops={stops.filter((stop) => stop.place === valid).map((stop) => (valid === "library" ? { ...stop, href: `/courses/${courseId}/kelas?materi=${stop.key.replace(/^lesson-/, "")}` } : stop))}
            closeTo={`/courses/${courseId}`}
            action={valid === "library" ? { to: `/courses/${courseId}/kelas`, label: "Masuk kelas" } : undefined}
          />
        ) : stops.length === 0 ? (
          <div className={cn(card, "w-full max-w-[26rem] p-4 text-center")}>
            <p className="font-semibold">Pulau ini masih kosong</p>
            <p className="text-sm text-[#5e5e72]">Gurumu belum menerbitkan materi atau tugas.</p>
          </div>
        ) : (
          <div className="flex max-w-[40rem] flex-wrap justify-center gap-1.5">
            {placesHere.map((key) => (
              <Link key={key} to={`/courses/${courseId}?tempat=${key}`} className={cn("pointer-events-auto rounded-full bg-white/95 px-3.5 py-2 text-[13px] font-semibold shadow-[0_4px_14px_rgba(24,21,58,.15)]", press)}>
                {placeName[key]}
              </Link>
            ))}
            {halls.map((hall) => (
              <Link key={hall.key} to={hall.href} className={cn("pointer-events-auto max-w-[16rem] truncate rounded-full bg-[#18153a] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(24,21,58,.15)]", press)}>
                Balai · {hall.title}
              </Link>
            ))}
          </div>
        )}
        <Link to={`/courses/${courseId}/daftar`} className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold shadow-sm">
          <List className="size-3.5" aria-hidden="true" />
          Tampilan daftar
        </Link>
      </Dock>
    </Overlay>
  );
}

function PlaceCard({ title, stops, closeTo, action }: { title: string; stops: Stop[]; closeTo: string; action?: { to: string; label: string } }) {
  return (
    <section aria-label={title} className={cn(card, "flex max-h-[min(22rem,55dvh)] w-full max-w-[26rem] flex-col p-2")}>
      <header className="flex items-center justify-between gap-2 px-2.5 pb-1 pt-1.5">
        <h2 className="font-heading text-lg font-bold">{title}</h2>
        <Link to={closeTo} aria-label="Tutup" className="grid size-9 place-items-center rounded-full hover:bg-[#f6f3fd]">
          <X className="size-4" aria-hidden="true" />
        </Link>
      </header>
      {action && (
        <Link to={action.to} className={cn("mx-1 mb-1 flex items-center justify-center gap-2 rounded-[14px] bg-[#18153a] px-4 py-3 text-sm font-bold text-white", press)}>
          {action.label}
        </Link>
      )}
      <ul className="flex flex-col overflow-y-auto">
        {stops.map((stop) => (
          <li key={stop.key}>
            <Link to={stop.href} className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 hover:bg-[#f6f3fd]">
              <span className={cn("size-3 shrink-0 rounded-full", stop.done ? "bg-[#4bd29f]" : "bg-[#d3c5f8]")} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{stop.title}</span>
                <span className="block text-[13px] text-[#5e5e72]">{stop.detail}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-[#5d5a83]" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---- Balai ---------------------------------------------------------------------------

export function BalaiOverlay({
  island,
  course,
  assignmentId,
  lit,
}: {
  island: IslandData;
  course: CourseData;
  assignmentId: string;
  lit: { stage: WorkflowStage; awards: EarnedPoint[] } | null;
}) {
  const building = island.buildings.find((item) => item.assignmentId === assignmentId) ?? null;
  const courseId = island.course.id;
  const studentId = useStudentId();
  const navigate = useNavigate();
  const location = useLocation();
  const [openPost, setOpenPost] = useState<WorkflowStage | null>(null);
  const [chest, setChest] = useState<ChestState>(building?.chestOpen ? (chestSeen(assignmentId) ? "open" : "ready") : "locked");
  const [moment, setMoment] = useState<"chest" | { badge: BadgeProgress["id"] } | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<BadgeProgress["id"][]>([]);
  const [points, setPoints] = useState<PointsData | null>(null);
  const [litPlaying, setLitPlaying] = useState(Boolean(lit));

  useEffect(() => {
    if (building?.chestOpen) setChest(chestSeen(assignmentId) ? "open" : "ready");
  }, [building?.chestOpen, assignmentId]);

  // After the lit post: drop ?nyala so a reload does not replay it, then let the
  // level-up check run with fresh points.
  const litDone = useCallback(() => {
    setLitPlaying(false);
    navigate(location.pathname, { replace: true, preventScrollReset: true });
    http.get<PointsData>("/api/student/points").then(setPoints).catch(() => {});
  }, [navigate, location.pathname]);

  const detail = useMemo(() => ({ course, island }), [course, island]);
  useStageScene(
    {
      detail,
      shot: { kind: "hall", courseId, assignmentId },
      lit: lit && litPlaying ? { assignmentId, ...lit, onDone: litDone } : null,
      chest: building ? { assignmentId, state: chest, onOpen: () => setMoment("chest") } : null,
      onSelectPost: setOpenPost,
    },
    [detail, assignmentId, lit, litPlaying, chest, building],
  );

  function afterChest() {
    markChestSeen(assignmentId);
    setChest("open");
    const fresh = studentId ? newBadges(studentId, island.badges) : [];
    setBadgeQueue(fresh.slice(1));
    setMoment(fresh[0] ? { badge: fresh[0] } : null);
  }
  function afterBadge(id: BadgeProgress["id"]) {
    if (studentId) markBadgeSeen(studentId, id);
    const [next, ...rest] = badgeQueue;
    setBadgeQueue(rest);
    setMoment(next ? { badge: next } : null);
  }

  const crumbs = [{ label: "Dunia", to: "/dunia" }, { label: `Pulau ${island.course.subjectName}`, to: `/courses/${courseId}` }, { label: building?.title ?? "Balai" }];
  if (!building) {
    return (
      <Overlay>
        <TopBar back={`/courses/${courseId}`} crumbs={crumbs} />
        <Dock>
          <div className={cn(card, "w-full max-w-[26rem] p-4 text-center")}>
            <p className="font-semibold">Balai ini tidak ada di Pulau {island.course.subjectName}</p>
          </div>
        </Dock>
      </Overlay>
    );
  }
  const currentIndex = building.posts.findIndex((post) => post.status === "current");
  const done = building.posts.filter((post) => post.status === "done").length;
  const started = building.submissionStatus !== null;
  // In the world the work happens at the classroom's book, with the tutor spirit beside it.
  const workHref = classroomUrl(courseId, { focus: "tugas", assignmentId });
  const next = currentIndex >= 0 ? currentIndex : !started && building.open ? 0 : -1;
  return (
    <Overlay>
      <TopBar back={`/courses/${courseId}`} crumbs={crumbs} />
      <Dock>
        <div className={cn(card, "flex w-full max-w-[26rem] items-center gap-3 p-3")}>
          <span className="grid size-11 shrink-0 place-items-center rounded-full border-4 border-[#4bd29f] bg-[#dff7ee] text-sm font-bold">{next >= 0 ? next + 1 : "★"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#5e5e72]">{next >= 0 ? `${done}/5 pos menyala · berikutnya` : chest === "open" ? "Peti sudah dibuka" : building.chestOpen ? "Kelima pos menyala" : "Tugas sudah ditutup"}</p>
            <p className="truncate text-[15px] font-bold">{next >= 0 ? postNames[building.posts[next]!.stage] : building.chestOpen ? (chest === "open" ? "Laporan reflektif" : "Peti balai") : building.title}</p>
          </div>
          {chest === "ready" ? (
            <button type="button" data-press onClick={() => setMoment("chest")} className="shrink-0 rounded-[14px] bg-[#4bd29f] px-4 py-3 text-sm font-bold text-[#04352a]">Buka peti</button>
          ) : next >= 0 || building.chestOpen ? (
            <Link to={workHref} data-press className="shrink-0 rounded-[14px] bg-[#18153a] px-4 py-3 text-sm font-bold text-white">
              {building.chestOpen ? "Lihat" : "Masuk pos"}
            </Link>
          ) : null}
        </div>
      </Dock>
      <PostSheet building={building} stage={openPost} href={workHref} onOpenChange={(open) => !open && setOpenPost(null)} />
      {moment === "chest" && <ChestMoment points={building.points} assignmentId={assignmentId} onClose={afterChest} />}
      {moment && moment !== "chest" && <BadgeMoment badge={moment.badge} onClose={() => afterBadge(moment.badge)} />}
      {points && studentId && !moment && <LevelUpMoment userId={studentId} points={points} />}
    </Overlay>
  );
}

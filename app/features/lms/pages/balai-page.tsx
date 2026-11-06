import { Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { http } from "~/lib/http";

import { cn } from "~/lib/utils";
import { IslandJourney } from "../components/island-journey";
import { PostSheet } from "../components/post-sheet";
import { BadgeMoment, ChestMoment, chestSeen, markBadgeSeen, markChestSeen, newBadges } from "../components/game-moments";
import { LevelUpMoment } from "../components/progress-widgets";
import { useStudentId } from "../hooks/use-student-id";
import { badgeCopy, postNames } from "../lib/game";
import type { BadgeProgress, EarnedPoint, IslandData, PointsData, PostStatus, WorkflowStage } from "../types";

type Building = IslandData["buildings"][number];

// Pad states as the canvas design "3D · Kelas" draws them.
const padStyle: Record<PostStatus, { row: string; dot: string; tag: string; tagClass: string }> = {
  done: { row: "", dot: "bg-[#4bd29f] border-[#18153a]", tag: "Menyala", tagClass: "text-[#0f6e56]" },
  current: { row: "bg-[#dff7ee]", dot: "bg-white border-[#4bd29f]", tag: "Kamu di sini", tagClass: "text-[#0f6e56]" },
  locked: { row: "", dot: "bg-[#f6f3fd] border-[#d3c5f8]", tag: "Terkunci", tagClass: "text-[#5d5a83]" },
};
const segment: Record<PostStatus, string> = {
  done: "bg-[#4bd29f]",
  current: "bg-[#a6e9cf]",
  locked: "bg-[#ece7fb]",
};

// One assignment as a hall on the course's island (PRD §5.9): the path of
// five posts (the five stages) on the left, the posts, the chest and the next
// step on the right. Poin Nalar and badges reward how the work was done; the AI
// Offloading Index is not here and never feeds them. The world keeps its own
// light palette in both themes, like the artwork it sits on.
export function BalaiPage({
  data,
  assignmentId,
  lit = null,
}: {
  data: IslandData;
  assignmentId: string;
  lit?: { stage: WorkflowStage; awards: EarnedPoint[] } | null;
}) {
  const selected = data.buildings.find((item) => item.assignmentId === assignmentId) ?? null;
  const backTo = `/courses/${data.course.id}`;
  const [openPost, setOpenPost] = useState<WorkflowStage | null>(null);
  const studentId = useStudentId();
  const navigate = useNavigate();
  const location = useLocation();
  // A chest that the student has not opened on this device yet waits, beckoning.
  const [chest, setChest] = useState<"locked" | "ready" | "open">(selected?.chestOpen ? "open" : "locked");
  const [moment, setMoment] = useState<"chest" | { badge: BadgeProgress["id"] } | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<BadgeProgress["id"][]>([]);
  const [points, setPoints] = useState<PointsData | null>(null);

  useEffect(() => {
    if (selected?.chestOpen) setChest(chestSeen(selected.assignmentId) ? "open" : "ready");
  }, [selected?.chestOpen, selected?.assignmentId]);

  // After the lit post: drop ?nyala so a reload does not replay it, then let
  // the level-up check run with fresh points.
  const litDone = useCallback(() => {
    navigate(location.pathname, { replace: true, preventScrollReset: true });
    http.get<PointsData>("/api/student/points").then(setPoints).catch(() => {});
  }, [navigate, location.pathname]);

  function afterChest() {
    if (selected) markChestSeen(selected.assignmentId);
    setChest("open");
    const fresh = studentId ? newBadges(studentId, data.badges) : [];
    setBadgeQueue(fresh.slice(1));
    setMoment(fresh[0] ? { badge: fresh[0] } : null);
  }
  function afterBadge(id: BadgeProgress["id"]) {
    if (studentId) markBadgeSeen(studentId, id);
    const [next, ...rest] = badgeQueue;
    setBadgeQueue(rest);
    setMoment(next ? { badge: next } : null);
  }

  return (
    <div className="bg-[#d6ccf4] text-[#18153a] [color-scheme:light] max-md:-mx-4 max-md:-mt-8 max-md:pb-4 sm:max-md:-mx-6 md:rounded-[2rem] md:p-6">
      {!selected ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <img src="/game/academy.webp" alt="" width={304} height={360} className="h-40 w-auto" />
          <p className="font-heading text-lg font-semibold">Balai ini tidak ada di Kelas {data.course.subjectName}</p>
          <Link to={backTo} className="text-sm font-medium underline underline-offset-4">
            Kembali ke kelas
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-start md:gap-6">
          <IslandJourney
            building={selected}
            backTo={backTo}
            onSelectPost={setOpenPost}
            subject={data.course.subjectName}
            chest={chest}
            onOpenChest={() => setMoment("chest")}
            lit={lit}
            onLitDone={litDone}
            className="mx-auto max-md:rounded-none md:max-w-[37.5rem] md:flex-[1_1_32.5rem]"
          />

          <section className="flex min-w-0 flex-[1_1_23.75rem] flex-col gap-4 max-md:px-3">
            <CurrentPostCard building={selected} onOpen={setOpenPost} />
            <Header building={selected} data={data} />
            <PadList building={selected} onSelect={setOpenPost} />
            <ChestCard building={selected} />
            <PrimaryAction building={selected} chest={chest} onOpenChest={() => setMoment("chest")} />
            <IslandStats data={data} />
          </section>
          <PostSheet building={selected} stage={openPost} onOpenChange={(open) => !open && setOpenPost(null)} />
          {moment === "chest" && <ChestMoment points={selected.points} assignmentId={selected.assignmentId} onClose={afterChest} />}
          {moment && moment !== "chest" && <BadgeMoment badge={moment.badge} onClose={() => afterBadge(moment.badge)} />}
          {points && studentId && !moment && <LevelUpMoment userId={studentId} points={points} />}
        </div>
      )}
    </div>
  );
}

// The canvas "Kelas (HP)": on phones the post you are on sits in a card that
// overlaps the bottom of the island, with one button to open it.
function CurrentPostCard({ building, onOpen }: { building: Building; onOpen: (stage: WorkflowStage) => void }) {
  const index = building.posts.findIndex((post) => post.status === "current");
  const post = index >= 0 ? building.posts[index]! : null;
  const next = post ?? (building.chestOpen ? null : building.posts[0]!);
  if (!next) return null;
  const at = building.posts.indexOf(next);
  return (
    <div className="relative z-10 -mt-16 flex flex-col gap-2.5 rounded-[1.5rem] bg-white p-3.5 shadow-lg md:hidden">
      <div className="flex items-center gap-2.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-4 border-[#4bd29f] bg-[#dff7ee] text-sm font-bold">
          {at + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-bold">{postNames[next.stage]}</p>
          <p className="text-xs text-[#5e5e72]">{post ? "Sedang kamu kerjakan" : "Mulai dari pos pertama"}</p>
        </div>
        {building.points > 0 && (
          <span className="shrink-0 rounded-full bg-[#dff7ee] px-2.5 py-1 text-xs font-bold text-[#0f6e56] tabular-nums">
            +{building.points}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen(next.stage)}
        className="flex min-h-12 items-center justify-center rounded-2xl bg-[#18153a] text-[0.9375rem] font-semibold text-white transition-transform duration-150 active:scale-[0.98]"
      >
        Masuk pos
      </button>
    </div>
  );
}

function Header({ building, data }: { building: Building; data: IslandData }) {
  const lit = building.posts.filter((post) => post.status === "done").length;
  const position = data.buildings.indexOf(building) + 1;
  return (
    <div className="rounded-[1.75rem] bg-white p-6">
      <p className="text-[0.8125rem] text-[#5e5e72]">
        Kelas {data.course.subjectName} · Balai {position} dari {data.buildings.length}
      </p>
      <h1 className="mb-3 mt-1 font-heading text-2xl font-bold text-balance sm:text-3xl">{building.title}</h1>
      <div className="mb-2 flex gap-1" role="img" aria-label={`${lit} dari 5 pos menyala`}>
        {building.posts.map((post) => (
          <span key={post.stage} className={cn("h-2.5 flex-1 rounded", segment[post.status])} />
        ))}
      </div>
      <p className="text-sm text-[#5e5e72]">
        {building.chestOpen
          ? "Kelima pos sudah menyala. Peti balai ini sudah terbuka."
          : "Nyalakan kelima pos dengan cara kerjamu sendiri untuk membuka peti balai."}
      </p>
    </div>
  );
}

function PadList({ building, onSelect }: { building: Building; onSelect: (stage: WorkflowStage) => void }) {
  const started = building.submissionStatus !== null;
  return (
    <ol className="rounded-[1.75rem] bg-white px-3 py-2">
      {building.posts.map((post, index) => {
        const style = padStyle[post.status];
        const state =
          post.status === "done"
            ? post.points > 0
              ? `Selesai · +${post.points} Poin Nalar`
              : "Selesai"
            : post.status === "current"
              ? "Sedang kamu kerjakan"
              : index === 0 && !started
                ? building.open
                  ? "Mulai dari sini"
                  : "Tugas sudah ditutup"
                : `Terbuka setelah pos ${index}`;
        return (
          <li key={post.stage}>
            <button
              type="button"
              onClick={() => onSelect(post.stage)}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-[1.125rem] p-3 text-left transition-[background-color,transform] duration-150 hover:bg-[#f6f3fd] active:scale-[0.99]",
                style.row,
              )}
            >
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-full border-4 text-sm font-bold",
                style.dot,
              )}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] font-semibold">{postNames[post.stage]}</p>
              <p className="mt-0.5 text-[0.8125rem] text-[#5e5e72]">{state}</p>
            </div>
            <span className={cn("shrink-0 text-[0.8125rem] font-semibold", style.tagClass)}>{style.tag}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ChestCard({ building }: { building: Building }) {
  return (
    <div className="flex items-center gap-4 rounded-[1.75rem] bg-[#18153a] px-5 py-4.5 text-white">
      <span className="flex size-22 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-white">
        <img
          src="/game/chest.webp"
          alt=""
          width={227}
          height={240}
          className={cn("size-[86%] object-contain", !building.chestOpen && "opacity-60 grayscale")}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#c6c1f1]">Hadiah balai</p>
        <p className="mb-1 mt-0.5 font-semibold">Peti {building.title}</p>
        <p className="text-[0.8125rem] text-[#c6c1f1]">
          {building.chestOpen
            ? `${building.points} Poin Nalar dari tugas ini, plus laporan reflektif dan Index yang hanya untukmu dan gurumu.`
            : "Terbuka setelah Pos 5: laporan reflektif dan Index tugas ini, hanya untukmu dan gurumu."}
        </p>
      </div>
    </div>
  );
}

function PrimaryAction({ building, chest, onOpenChest }: { building: Building; chest: "locked" | "ready" | "open"; onOpenChest: () => void }) {
  const href = `/assignments/${building.assignmentId}`;
  const current = building.posts.findIndex((post) => post.status === "current");
  if (chest === "ready") {
    return (
      <button
        type="button"
        data-press
        onClick={onOpenChest}
        className="flex min-h-14 items-center justify-center rounded-[1.125rem] bg-[#4bd29f] px-4 text-center font-bold text-[#04352a] hover:bg-[#5fdcab]"
      >
        Buka peti balai
      </button>
    );
  }
  const label = building.chestOpen
    ? "Baca laporan reflektif"
    : current >= 0
      ? `Masuk Pos ${current + 1} · ${postNames[building.posts[current]!.stage]}`
      : building.open
        ? `Mulai Pos 1 · ${postNames["1_independent_effort"]}`
        : null;
  if (!label) return null;
  return (
    <Link
      to={href}
      data-press
      className="flex min-h-14 items-center justify-center rounded-[1.125rem] bg-[#4bd29f] px-4 text-center font-bold text-[#04352a] hover:bg-[#5fdcab]"
    >
      {label}
    </Link>
  );
}

// Points, the class bridge and badges. The bridge is a class target: one
// plank per finished journey, nobody named or ranked.
function IslandStats({ data }: { data: IslandData }) {
  const { planks, total } = data.bridge;
  const shown = Math.min(total, 30);
  const filled = total === 0 ? 0 : Math.round((planks / total) * shown);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-center gap-3 rounded-[1.5rem] bg-white/80 p-4">
        <img src="/game/coin.webp" alt="" width={125} height={128} className="size-11 shrink-0" />
        <div>
          <p className="font-heading text-2xl font-semibold tabular-nums">{data.points.total}</p>
          <p className="text-xs text-[#5e5e72]">Poin Nalar di kelas ini</p>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-2 rounded-[1.5rem] bg-white/80 p-4">
        <p className="flex items-baseline justify-between gap-2 text-sm font-semibold">
          Jembatan kelas
          <span className="text-xs font-normal text-[#5e5e72] tabular-nums">
            {planks}/{total} papan
          </span>
        </p>
        <div className="flex gap-0.5" aria-hidden="true">
          {Array.from({ length: shown }, (_, index) => (
            <span key={index} className={cn("h-2.5 flex-1 rounded-[2px]", index < filled ? "bg-[#4bd29f]" : "bg-[#ece7fb]")} />
          ))}
        </div>
        <p className="flex items-center gap-1 text-[0.6875rem] text-[#5e5e72]">
          <Users className="size-3 shrink-0" aria-hidden="true" />
          Tiap tugas yang dituntaskan teman menambah papan.
        </p>
      </div>
      <Badges badges={data.badges} />
    </div>
  );
}

function Badges({ badges }: { badges: BadgeProgress[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-3 rounded-[1.5rem] bg-white/80 p-4 sm:col-span-2">
      {badges.map((badge) => {
        const copy = badgeCopy[badge.id];
        return (
          <li key={badge.id} className="flex min-w-[9rem] flex-1 items-center gap-2.5">
            <img
              src={copy.image}
              alt=""
              width={192}
              height={200}
              className={cn("size-11 shrink-0", !badge.earned && "opacity-45 grayscale")}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {copy.title}
                <span className="sr-only">{badge.earned ? ", sudah didapat" : ", belum didapat"}</span>
              </p>
              <p className="text-xs text-[#5e5e72]">
                {badge.earned ? copy.detail : `${badge.progress}/${badge.target} · ${copy.detail}`}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

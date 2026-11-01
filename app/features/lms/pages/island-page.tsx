import { Check, ChevronRight, List, Users } from "lucide-react";
import { Link } from "react-router";

import { cn } from "~/lib/utils";
import { LABS } from "~/features/labs";
import { formatDateTime } from "../lib/format";
import { postNames } from "../lib/game";
import type { CourseData, IslandData } from "../types";

// A course as an island (PRD §5.9): every module is a district, and in it the
// student finds the library (lessons with the PDF tutor), the lab, the arena
// (quizzes) and the halls (assignments with their five posts). The course the
// teacher built is the map; nothing is authored twice. Like the rest of the
// game world it keeps its light palette in both themes.

const finished = new Set(["closed", "completed", "expired", "graded", "returned", "submitted"]);

type Place = "library" | "lab" | "arena" | "hall";
type Stop = {
  key: string;
  place: Place;
  title: string;
  href: string;
  done: boolean;
  detail: string;
  posts?: IslandData["buildings"][number]["posts"];
};

const placeArt: Record<Place, { src: string; name: string }> = {
  library: { src: "/game/library.webp", name: "Perpustakaan" },
  lab: { src: "/game/lab.webp", name: "Lab" },
  arena: { src: "/game/arena.webp", name: "Arena latihan" },
  hall: { src: "/game/academy.webp", name: "Balai" },
};

function districtsOf(course: CourseData, island: IslandData) {
  const buildingOf = new Map(island.buildings.map((item) => [item.assignmentId, item]));
  const stopsFor = (moduleId: string | null, lessons: CourseData["modules"][number]["lessons"]) => {
    const stops: Stop[] = [];
    for (const lesson of lessons) {
      stops.push({
        key: `lesson-${lesson.id}`,
        place: "library",
        title: lesson.title,
        href: `/lessons/${lesson.id}`,
        done: lesson.status === "completed",
        detail: lesson.status === "completed" ? "Sudah dibaca" : lesson.status === "in_progress" ? "Sedang dibaca" : "Materi",
      });
      for (const lab of island.labs.filter((item) => item.lessonId === lesson.id)) {
        stops.push({
          key: `lab-${lab.id}`,
          place: "lab",
          title: LABS[lab.labKey]?.title ?? lab.labKey,
          href: `/lessons/${lesson.id}?ruang=lab`,
          done: lab.challenges > 0 && lab.solved >= lab.challenges,
          detail: `${lab.solved} dari ${lab.challenges} tantangan`,
        });
      }
    }
    for (const quiz of course.quizzes.filter((item) => item.moduleId === moduleId)) {
      const isDone = finished.has(quiz.attemptStatus ?? "");
      stops.push({
        key: `quiz-${quiz.id}`,
        place: "arena",
        title: quiz.title,
        href: `/quizzes/${quiz.id}`,
        done: isDone,
        detail: isDone ? "Selesai" : quiz.dueAt ? `Tenggat ${formatDateTime(quiz.dueAt)}` : "Latihan",
      });
    }
    for (const assignment of course.assignments.filter((item) => item.moduleId === moduleId)) {
      const building = buildingOf.get(assignment.id);
      const lit = building?.posts.filter((post) => post.status === "done").length ?? 0;
      const current = building?.posts.find((post) => post.status === "current");
      stops.push({
        key: `hall-${assignment.id}`,
        place: "hall",
        title: assignment.title,
        href: `/courses/${course.course.id}/balai/${assignment.id}`,
        done: Boolean(building?.chestOpen),
        detail: building?.chestOpen
          ? "Peti terbuka"
          : current
            ? `${lit}/5 pos · berikutnya ${postNames[current.stage]}`
            : `Tenggat ${formatDateTime(assignment.dueAt)}`,
        posts: building?.posts,
      });
    }
    return stops;
  };

  const districts = course.modules
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((module) => ({ id: module.id, title: module.title, stops: stopsFor(module.id, module.lessons) }));
  const loose = stopsFor(null, []);
  if (loose.length > 0) districts.push({ id: "umum", title: "Alun-alun", stops: loose });
  return districts.filter((district) => district.stops.length > 0);
}

export function IslandPage({ course, island }: { course: CourseData; island: IslandData }) {
  const districts = districtsOf(course, island);
  const next = districts.flatMap((district) => district.stops).find((stop) => !stop.done) ?? null;
  const allStops = districts.flatMap((district) => district.stops);
  const doneCount = allStops.filter((stop) => stop.done).length;

  return (
    <div className="rounded-[2rem] bg-[#d6ccf4] p-3 text-[#18153a] [color-scheme:light] sm:p-6">
      <div className="flex flex-col gap-5">
        <header className="flex flex-wrap items-start gap-4 rounded-[1.75rem] bg-white p-5 sm:p-6">
          <div className="min-w-0 flex-[1_1_18rem]">
            <p className="text-[0.8125rem] text-[#5e5e72]">
              <Link to="/dunia" className="underline-offset-4 hover:underline">
                Dunia
              </Link>{" "}
              · {course.course.name}
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-balance sm:text-3xl">Pulau {course.course.subjectName}</h1>
            {course.teachers.length > 0 && (
              <p className="mt-1 text-sm text-[#5e5e72]">Pemandu: {course.teachers.join(", ")}</p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <div
                className="h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-[#ece7fb]"
                role="progressbar"
                aria-label="Tempat yang sudah dituntaskan"
                aria-valuemin={0}
                aria-valuemax={allStops.length}
                aria-valuenow={doneCount}
              >
                <div className="h-full rounded-full bg-[#4bd29f]" style={{ width: `${allStops.length ? (doneCount / allStops.length) * 100 : 0}%` }} />
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums">
                {doneCount}/{allStops.length} tempat
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f6f3fd] pl-1.5 pr-4 font-heading font-semibold">
              <img src="/game/coin.webp" alt="" width={125} height={128} className="size-8" />
              <span className="tabular-nums">{island.points.total}</span>
              <span className="sr-only">Poin Nalar di pulau ini</span>
            </span>
            <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f6f3fd] px-3.5 text-sm font-semibold">
              <Users className="size-4" aria-hidden="true" />
              Jembatan {island.bridge.planks}/{island.bridge.total}
            </span>
            <Link
              to={`/courses/${course.course.id}/daftar`}
              className="inline-flex h-11 items-center gap-2 rounded-2xl px-3.5 text-sm font-semibold ring-1 ring-[#d3c5f8] transition-colors duration-150 hover:bg-[#f6f3fd]"
            >
              <List className="size-4" aria-hidden="true" />
              Tampilan daftar
            </Link>
          </div>
        </header>

        {next && <NextStop stop={next} />}

        {districts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[1.75rem] bg-white/70 py-14 text-center">
            <img src="/game/library.webp" alt="" width={315} height={360} className="h-32 w-auto" />
            <p className="font-heading font-semibold">Pulau ini masih kosong</p>
            <p className="text-sm text-[#5e5e72]">Gurumu belum menerbitkan materi atau tugas.</p>
          </div>
        ) : (
          <ol className="flex flex-col gap-4">
            {districts.map((district, index) => (
              <District key={district.id} index={index} title={district.title} stops={district.stops} nextKey={next?.key ?? null} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function NextStop({ stop }: { stop: Stop }) {
  return (
    <Link
      to={stop.href}
      className="flex items-center gap-4 rounded-[1.5rem] bg-[#18153a] p-4 text-white transition-transform duration-150 active:scale-[0.99] sm:p-5"
    >
      <span className="size-14 shrink-0 overflow-hidden rounded-2xl bg-[#dff7ee]">
        <img src="/game/cat-avatar.webp" alt="" width={160} height={188} className="size-full object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-[#c6c1f1]">Lanjutkan · {placeArt[stop.place].name}</span>
        <span className="block truncate font-heading text-lg font-semibold">{stop.title}</span>
      </span>
      <span className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-[#4bd29f] px-4 text-sm font-bold text-[#04352a]">
        Masuk
        <ChevronRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

function District({ index, title, stops, nextKey }: { index: number; title: string; stops: Stop[]; nextKey: string | null }) {
  const places = (["library", "lab", "arena", "hall"] as Place[]).filter((place) => stops.some((stop) => stop.place === place));
  const done = stops.filter((stop) => stop.done).length;
  return (
    <li className="overflow-hidden rounded-[1.75rem] bg-white">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 bg-[linear-gradient(180deg,#f6f3fd,#ffffff)] px-5 pb-2 pt-4 sm:px-6">
        <div className="min-w-0 flex-[1_1_14rem] self-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5d5a83]">Wilayah {index + 1}</p>
          <h2 className="font-heading text-xl font-bold">{title}</h2>
          <p className="text-xs text-[#5e5e72] tabular-nums">
            {done}/{stops.length} tempat tuntas
          </p>
        </div>
        <div className="flex items-end gap-1" aria-hidden="true">
          {places.map((place) => (
            <img key={place} src={placeArt[place].src} alt="" width={315} height={360} className="h-20 w-auto sm:h-24" />
          ))}
        </div>
      </div>
      <ul className="flex flex-col px-3 pb-3 sm:px-4">
        {stops.map((stop) => (
          <li key={stop.key}>
            <Link
              to={stop.href}
              className={cn(
                "flex items-center gap-3 rounded-[1.125rem] p-2.5 transition-colors duration-150 hover:bg-[#f6f3fd]",
                stop.key === nextKey && "bg-[#dff7ee] hover:bg-[#d2f3e6]",
              )}
            >
              <span className="relative shrink-0">
                <img src={placeArt[stop.place].src} alt="" width={315} height={360} className="h-11 w-auto" />
                {stop.done && (
                  <span className="absolute -bottom-0.5 -right-1 flex size-5 items-center justify-center rounded-full bg-[#4bd29f] text-[#04352a] ring-2 ring-white">
                    <Check className="size-3" strokeWidth={3.5} aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5d5a83]">
                  {placeArt[stop.place].name}
                  <span className="sr-only">{stop.done ? ", tuntas" : ""}</span>
                </span>
                <span className="block truncate font-semibold">{stop.title}</span>
                <span className="block truncate text-xs text-[#5e5e72]">{stop.detail}</span>
              </span>
              {stop.posts && (
                <span className="hidden w-24 shrink-0 gap-1 sm:flex" aria-hidden="true">
                  {stop.posts.map((post) => (
                    <span
                      key={post.stage}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        post.status === "done" ? "bg-[#4bd29f]" : post.status === "current" ? "bg-[#a6e9cf]" : "bg-[#ece7fb]",
                      )}
                    />
                  ))}
                </span>
              )}
              {stop.key === nextKey ? (
                <span className="shrink-0 text-xs font-bold text-[#0f6e56]">Kamu di sini</span>
              ) : (
                <ChevronRight className="size-4 shrink-0 text-[#5d5a83]" aria-hidden="true" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

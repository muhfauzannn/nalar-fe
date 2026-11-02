import { ArrowRight, Clock3, KeyRound, Plus } from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyIllustration,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Separator } from "~/components/ui/separator";
import { CourseCard } from "../components/course-card";
import { formatDateTime, getGreeting, sentenceStatus } from "../lib/format";
import { LevelBar, LevelRing, LevelUpMoment, Missions, StreakChip, WeekTarget } from "../components/progress-widgets";
import { useStudentId } from "../hooks/use-student-id";
import { missionsJustDone } from "../components/game-moments";
import { missionCopy } from "../lib/game";
import { gameToast } from "~/features/game-feel";
import { useEffect } from "react";
import type { DashboardData, PointsData } from "../types";
import { usePageReady } from "~/features/loading/context";

export function DashboardPage({ data, points }: { data: DashboardData; points: PointsData | null }) {
  const firstName = data.user.name.split(/\s+/)[0] || "Siswa";
  const studentId = useStudentId();
  const ready = usePageReady();
  useEffect(() => {
    if (!ready || !studentId || !points) return;
    missionsJustDone(studentId, points.missions).forEach((item, index) =>
      window.setTimeout(
        () => gameToast({ title: "Misi selesai", sub: missionCopy[item.id], points: `${item.target}/${item.target}`, sound: "ding" }),
        600 + index * 900,
      ),
    );
  }, [ready, studentId, points]);
  const continueCourse =
    data.courses.find((course) => course.status === "published") ??
    data.courses[0];

  return (
    <div className="flex flex-col gap-10 lg:gap-12">
      {points && studentId && <LevelUpMoment userId={studentId} points={points} />}
      <PageHeader
        title={`${getGreeting()}, ${firstName}.`}
        actions={
          <>
            {points && (
              <Link
                to="/dunia"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-card pl-1.5 pr-4 font-heading font-semibold shadow-card ring-1 ring-border transition-transform duration-150 active:scale-[0.97]"
              >
                <img src="/game/coin.webp" alt="" width={125} height={128} className="size-7" />
                <span className="tabular-nums">{points.total.toLocaleString("id-ID")}</span>
                <span className="sr-only">Poin Nalar, buka peta dunia</span>
              </Link>
            )}
            {points && <StreakChip weeks={points.week.streakWeeks} className="h-10" />}
            {continueCourse && (
              <Button size="lg" render={<Link to={`/courses/${continueCourse.id}`} />}>
                Lanjut belajar
                <ArrowRight data-icon="inline-end" />
              </Button>
            )}
          </>
        }
      />

      {data.courses.length === 0 ? null : (
        <section
          aria-labelledby="learning-progress-title"
          className="relative isolate overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-card"
        >
          <img
            src="/illustration/decoration2.svg"
            loading="lazy"
            decoding="async"
            alt=""
            width={1402}
            height={1122}
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -bottom-24 hidden w-[26rem] select-none object-contain opacity-20 xl:block"
          />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-10">
            {points ? (
              <div className="flex min-w-0 items-center gap-5 sm:gap-6">
                <LevelRing level={points.level} size={104} className="max-sm:hidden" />
                <LevelRing level={points.level} size={76} className="sm:hidden" />
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <h2 id="learning-progress-title" className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                    {points.level.title}
                  </h2>
                  <LevelBar level={points.level} className="max-w-md" />
                  <p className="text-sm text-primary-foreground/75">
                    <strong className="font-semibold text-primary-foreground tabular-nums">
                      {points.level.into} / {points.level.needed}
                    </strong>{" "}
                    Poin Nalar · {points.level.needed - points.level.into} lagi ke Level {points.level.level + 1}
                  </p>
                  <p className="text-xs text-primary-foreground/60 tabular-nums">
                    Progres belajar {data.summary.progress}% · {data.summary.completedItems} dari {data.summary.totalItems} aktivitas selesai
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <h2 id="learning-progress-title" className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                  Progres belajar
                </h2>
                <p className="font-heading text-5xl font-semibold tracking-tight tabular-nums">{data.summary.progress}%</p>
              </div>
            )}
            {points && (
              <div className="rounded-2xl bg-primary-foreground/10 p-4 lg:min-w-[17rem]">
                <WeekTarget week={points.week} />
              </div>
            )}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 items-start gap-10 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div
          className="flex min-w-0 flex-col gap-6"
          aria-labelledby="my-courses-title"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2
              id="my-courses-title"
              className="font-heading text-2xl font-semibold tracking-tight"
            >
              Pulau saya
            </h2>
            {data.courses.length > 0 && (
              <Button variant="outline" size="sm" render={<Link to="/dunia" />}>
                Lihat semua
                <ArrowRight data-icon="inline-end" />
              </Button>
            )}
          </div>

          {data.courses.length === 0 ? (
            <Empty className="min-h-80 border">
              <EmptyIllustration alt="" width={1254} height={1254} />
              <EmptyHeader>
                <EmptyTitle>Belum ada course</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Button render={<Link to="/courses/join" />}>
                  <KeyRound data-icon="inline-start" />
                  Gabung dengan kode
                </Button>
                <Button variant="outline" render={<Link to="/manage/courses/new" />}>
                  <Plus data-icon="inline-start" />
                  Buat course
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-5 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
              {data.courses.slice(0, 4).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>

        <aside aria-labelledby="upcoming-title" className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-24">
          {points && (
            <Card>
              <CardHeader>
                <CardTitle>Misi minggu ini</CardTitle>
                <CardAction>
                  <span className="text-xs text-muted-foreground">sisa {points.week.daysLeft + 1} hari</span>
                </CardAction>
              </CardHeader>
              <CardContent>
                <Missions missions={points.missions} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle id="upcoming-title">Perlu diselesaikan</CardTitle>
              <CardAction>
                <Badge variant="lavender">{data.upcoming.length}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              {data.upcoming.length === 0 ? (
                <Empty className="min-h-52 p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Clock3 />
                    </EmptyMedia>
                    <EmptyTitle>Tidak ada tenggat</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col">
                  {data.upcoming.map((item, index) => (
                    <div key={`${item.type}-${item.id}`}>
                      <Link
                        to={`/${item.type === "quiz" ? "quizzes" : "assignments"}/${item.id}`}
                        className="group -mx-2 flex gap-3 rounded-lg px-2 py-4 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-accent-foreground">
                          <Clock3 className="size-4" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-2">
                          <span className="flex items-start justify-between gap-3">
                            <span className="font-medium leading-snug text-pretty">
                              {item.title}
                            </span>
                            <Badge variant="outline">
                              {item.type === "quiz" ? "Quiz" : "Tugas"}
                            </Badge>
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {item.courseName}
                          </span>
                          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="tabular-nums">{formatDateTime(item.dueAt)}</span>
                            <span>{sentenceStatus(item.status)}</span>
                          </span>
                        </span>
                      </Link>
                      {index < data.upcoming.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}

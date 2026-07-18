import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Gauge,
  GraduationCap,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { CourseCard } from "../components/course-card";
import { formatDateTime, getGreeting, sentenceStatus } from "../lib/format";
import type { DashboardData } from "../types";

export function DashboardPage({ data }: { data: DashboardData }) {
  const firstName = data.user.name.split(/\s+/)[0] || "Siswa";
  const continueCourse =
    data.courses.find((course) => course.status === "published") ??
    data.courses[0];

  return (
    <div className="flex flex-col gap-10 lg:gap-12">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {getGreeting()}, {firstName}.
        </h1>
        <p className="max-w-2xl leading-relaxed text-muted-foreground text-pretty">
          Lihat perkembangan belajarmu dan lanjutkan aktivitas yang paling perlu
          diselesaikan.
        </p>
      </header>

      {!data.school ? (
        <Alert>
          <BookOpen />
          <AlertTitle>Akun belum terhubung ke sekolah</AlertTitle>
          <AlertDescription>
            Course akan tampil setelah sekolah mengaktifkan membership dan
            enrollment siswa.
          </AlertDescription>
        </Alert>
      ) : (
        <section
          aria-label="Ringkasan belajar"
          className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(17rem,0.65fr)]"
        >
          <section
            aria-labelledby="learning-progress-title"
            className="relative isolate overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-card"
          >
            <img
              src="/illustration/decoration2.svg"
              alt=""
              width={1402}
              height={1122}
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -bottom-20 hidden w-[28rem] select-none object-contain opacity-25 xl:block"
            />

            <div className="relative flex min-h-full flex-col items-start gap-5 p-6 sm:p-8 lg:p-10  ">
              <Badge variant="mint">Semester berjalan</Badge>
              <div className="flex flex-col gap-2">
                <h2
                  id="learning-progress-title"
                  className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
                >
                  {data.summary.progress > 0
                    ? "Terus melaju, progresmu sudah terlihat."
                    : "Perjalanan belajarmu dimulai di sini."}
                </h2>
              </div>

              <div className="flex w-full max-w-lg flex-col gap-4 rounded-xl bg-background p-4 text-foreground shadow-card sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Progres keseluruhan
                    </p>
                    <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums">
                      {data.summary.progress}%
                    </p>
                  </div>
                  <p className="max-w-40 text-right text-xs leading-relaxed text-muted-foreground">
                    {data.summary.completedItems} dari {data.summary.totalItems}{" "}
                    aktivitas selesai
                  </p>
                </div>
                <Progress value={data.summary.progress}>
                  <ProgressLabel>Semester berjalan</ProgressLabel>
                  <ProgressValue>
                    {() => `${data.summary.progress}%`}
                  </ProgressValue>
                </Progress>
              </div>

              {continueCourse && (
                <Button
                  variant="secondary"
                  size="lg"
                  render={<Link to={`/courses/${continueCourse.id}`} />}
                >
                  Lanjut belajar
                  <ArrowRight data-icon="inline-end" />
                </Button>
              )}
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Ringkasan aktivitas</CardTitle>
              <CardDescription>Angka penting semester ini.</CardDescription>
              <CardAction>
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Gauge className="size-4" />
                </span>
              </CardAction>
            </CardHeader>
            <CardContent className="mt-auto">
              <dl className="flex flex-col">
                <MetricRow
                  title="Course aktif"
                  value={data.summary.activeCourses}
                  description="Siap dipelajari"
                  icon={BookOpen}
                />
                <Separator />
                <MetricRow
                  title="Total aktivitas"
                  value={data.summary.totalItems}
                  description="Materi, tugas, dan quiz"
                  icon={ListChecks}
                />
                <Separator />
                <MetricRow
                  title="Aktivitas selesai"
                  value={data.summary.completedItems}
                  description="Sudah kamu tuntaskan"
                  icon={CheckCircle2}
                />
                {data.school.gradeLevel && (
                  <>
                    <Separator />
                    <MetricRow
                      title="Tingkat kelas"
                      value={data.school.gradeLevel}
                      description="Tahun ajaran aktif"
                      icon={GraduationCap}
                    />
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div
          className="flex min-w-0 flex-col gap-6"
          aria-labelledby="my-courses-title"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h2
                id="my-courses-title"
                className="font-heading text-2xl font-semibold tracking-tight"
              >
                Course saya
              </h2>
              <p className="text-sm text-muted-foreground">
                Pilih course untuk melanjutkan pembelajaran terakhir.
              </p>
            </div>
            {data.courses.length > 0 && (
              <Button variant="ghost" size="sm" render={<Link to="/courses" />}>
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
                <EmptyDescription>
                  Course yang sudah dipublikasikan akan muncul setelah
                  enrollment aktif.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {data.courses.slice(0, 4).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>

        <aside aria-labelledby="upcoming-title" className="xl:sticky xl:top-24">
          <Card>
            <CardHeader>
              <CardTitle id="upcoming-title">Perlu diselesaikan</CardTitle>
              <CardDescription>
                Tenggat assignment dan quiz terdekat.
              </CardDescription>
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
                    <EmptyTitle>Tidak ada aktivitas tertunda</EmptyTitle>
                    <EmptyDescription>
                      Tenggat assignment dan quiz akan muncul di sini.
                    </EmptyDescription>
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
                            <span>{formatDateTime(item.dueAt)}</span>
                            <Badge variant="ghost">
                              {sentenceStatus(item.status)}
                            </Badge>
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

function MetricRow({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4 first:pt-0 last:pb-0">
      <dt className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {description}
          </span>
        </span>
      </dt>
      <dd className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
    </div>
  );
}

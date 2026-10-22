import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  KeyRound,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
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
      <PageHeader
        title={`${getGreeting()}, ${firstName}.`}
        description="Lihat perkembangan belajarmu dan lanjutkan aktivitas yang paling perlu diselesaikan."
        actions={
          continueCourse && (
            <Button size="lg" render={<Link to={`/courses/${continueCourse.id}`} />}>
              Lanjut belajar
              <ArrowRight data-icon="inline-end" />
            </Button>
          )
        }
      />

      {data.courses.length === 0 ? null : (
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
            className="pointer-events-none absolute -right-16 -bottom-24 hidden w-[26rem] select-none object-contain opacity-20 xl:block"
          />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-end lg:gap-12 lg:p-10">
            <div className="flex flex-col gap-5">
              <h2
                id="learning-progress-title"
                className="font-heading text-xl font-semibold tracking-tight text-balance sm:text-2xl"
              >
                {data.summary.progress > 0
                  ? "Terus melaju, progresmu sudah terlihat."
                  : "Perjalanan belajarmu dimulai di sini."}
              </h2>
              <div className="flex max-w-lg flex-col gap-3">
                <p className="flex items-baseline gap-3">
                  <span className="font-heading text-5xl font-semibold tracking-tight tabular-nums">
                    {data.summary.progress}%
                  </span>
                  <span className="text-sm text-primary-foreground/75">
                    {data.summary.completedItems} dari {data.summary.totalItems} aktivitas
                    selesai
                  </span>
                </p>
                <div
                  role="progressbar"
                  aria-label="Progres keseluruhan"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={data.summary.progress}
                  className="h-2 overflow-hidden rounded-full bg-primary-foreground/15"
                >
                  <div
                    className="h-full rounded-full bg-brand-mint"
                    style={{ width: `${data.summary.progress}%` }}
                  />
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-4 border-t border-primary-foreground/15 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <Metric value={data.summary.activeCourses} label="Course" icon={BookOpen} />
              <Metric value={data.summary.completedItems} label="Selesai" icon={CheckCircle2} />
              <Metric value={data.upcoming.length} label="Tertunda" icon={Clock3} />
            </dl>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 items-start gap-10 xl:grid-cols-[minmax(0,1fr)_23rem]">
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
              <Button variant="outline" size="sm" render={<Link to="/courses" />}>
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
                  Course yang kamu ikuti akan muncul di sini setelah kamu
                  bergabung.
                </EmptyDescription>
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

        <aside aria-labelledby="upcoming-title" className="min-w-0 xl:sticky xl:top-24">
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

function Metric({
  value,
  label,
  icon: Icon,
}: {
  value: number;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <dt className="flex items-center gap-1.5 text-xs text-primary-foreground/75">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="font-heading text-3xl font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}

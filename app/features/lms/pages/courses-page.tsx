import { BookOpen, CheckCircle2, Layers3 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import {
  Card,
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
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "~/components/ui/progress";
import { CourseCard } from "../components/course-card";
import type { CourseSummary } from "../types";

export function CoursesPage({
  data: loaderData,
}: {
  data: {
    school: { id: string; name: string } | null;
    courses: CourseSummary[];
  };
}) {
  const activeCourses = loaderData.courses.filter(
    (course) => course.status === "published",
  ).length;
  const archivedCourses = loaderData.courses.length - activeCourses;
  const totalActivities = loaderData.courses.reduce(
    (total, course) => total + course.progress.total,
    0,
  );
  const completedActivities = loaderData.courses.reduce(
    (total, course) => total + course.progress.completed,
    0,
  );
  const overallProgress = totalActivities
    ? Math.round((completedActivities / totalActivities) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-10 lg:gap-12">
      <section className="relative isolate overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-card">
        <div
          aria-hidden="true"
          className="absolute -top-24 -left-24 size-72 rounded-full bg-secondary/10"
        />

        <div className="relative grid min-h-72 items-center gap-8 px-6 py-8 sm:px-9 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:px-12 lg:py-10">
          <header className="flex max-w-3xl flex-col items-start gap-4">
            <Badge variant="mint">
              {loaderData.school?.name ?? "Ruang belajar siswa"}
            </Badge>
            <div className="flex flex-col gap-3">
              <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
                Course saya
              </h1>
              <p className="max-w-2xl text-sm/relaxed text-primary-foreground/70 sm:text-base/relaxed">
                Buka course untuk melanjutkan materi, assignment, dan quiz.
              </p>
            </div>
            {loaderData.courses.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary-foreground/70">
                <span className="flex items-center gap-2">
                  <BookOpen className="size-4" aria-hidden="true" />
                  {activeCourses} course aktif
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {completedActivities} aktivitas selesai
                </span>
              </div>
            )}
          </header>

          <div className="relative mx-auto flex w-full max-w-sm items-center justify-center lg:justify-self-end">
            <img
              src="/illustration/decoration3.svg"
              width={1402}
              height={1122}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 w-full max-w-80 -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-45"
            />
            <Card className="relative w-full max-w-72">
              <CardHeader>
                <CardTitle>Progres keseluruhan</CardTitle>
                <CardDescription>
                  {completedActivities} dari {totalActivities} aktivitas
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums">
                  {overallProgress}%
                </p>
                <Progress
                  value={overallProgress}
                  aria-label={`Progres keseluruhan ${overallProgress}%`}
                >
                  <ProgressLabel className="sr-only">
                    Progres keseluruhan
                  </ProgressLabel>
                  <ProgressValue className="sr-only">
                    {() => `${overallProgress}%`}
                  </ProgressValue>
                </Progress>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="course-list-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="course-list-title"
                className="font-heading text-2xl font-semibold tracking-tight"
              >
                Semua course
              </h2>
              <Badge variant="outline">{loaderData.courses.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Pilih ruang belajar yang ingin kamu lanjutkan.
            </p>
          </div>
          {archivedCourses > 0 && (
            <Badge variant="outline">{archivedCourses} diarsipkan</Badge>
          )}
        </div>

        {loaderData.courses.length === 0 ? (
          <Empty className="min-h-96 border bg-muted/30">
            <EmptyIllustration
              alt=""
              width={1254}
              height={1254}
              className="max-w-56"
            />
            <EmptyHeader>
              <EmptyTitle>Belum ada course</EmptyTitle>
              <EmptyDescription>
                {loaderData.school
                  ? "Course akan tampil setelah enrollment dipublikasikan."
                  : "Membership sekolah perlu diaktifkan terlebih dahulu."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {loaderData.courses.map((course) => (
              <CourseCard key={course.id} course={course} variant="detailed" />
            ))}
          </div>
        )}
      </section>

      {loaderData.courses.length > 0 && totalActivities === 0 && (
        <Alert>
          <Layers3 />
          <AlertTitle>Aktivitas belum tersedia</AlertTitle>
          <AlertDescription>
            Materi, assignment, dan quiz akan muncul setelah dipublikasikan.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

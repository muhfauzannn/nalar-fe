import { BookOpen, CheckCircle2, KeyRound, Layers3, Plus } from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "~/components/ui/empty";
import { CourseCard } from "../components/course-card";
import type { CourseSummary } from "../types";

export function CoursesPage({
  data: loaderData,
}: {
  data: {
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
      <PageHeader
        title="Course saya"
        description="Buka course untuk melanjutkan materi, assignment, dan quiz."
        meta={
          loaderData.courses.length > 0 && (
            <>
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-4" aria-hidden="true" />
                {activeCourses} course aktif
              </span>
              <span className="flex items-center gap-1.5 tabular-nums">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {completedActivities} dari {totalActivities} aktivitas selesai ({overallProgress}%)
              </span>
              {archivedCourses > 0 && (
                <Badge variant="outline">{archivedCourses} diarsipkan</Badge>
              )}
            </>
          )
        }
        actions={
          <>
            <Button variant="outline" render={<Link to="/courses/join" />}>
              <KeyRound data-icon="inline-start" />
              Gabung dengan kode
            </Button>
            <Button render={<Link to="/manage/courses/new" />}>
              <Plus data-icon="inline-start" />
              Buat course
            </Button>
          </>
        }
      />

      <section className="flex flex-col gap-6" aria-label="Daftar course">
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
                Gabung dengan kode kelas dari pengajarmu, atau buat course sendiri.
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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {loaderData.courses.map((course) => (
              <CourseCard key={course.id} course={course} />
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

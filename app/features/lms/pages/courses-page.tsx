import { KeyRound, Plus } from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
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
  const archivedCourses = loaderData.courses.filter(
    (course) => course.status === "archived",
  ).length;

  return (
    <div className="flex flex-col gap-10 lg:gap-12">
      <PageHeader
        title="Course saya"
        meta={
          archivedCourses > 0 && <Badge variant="outline">{archivedCourses} diarsipkan</Badge>
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
    </div>
  );
}

import { ArrowRight, KeyRound, Plus, Users } from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "~/components/ui/empty";
import { StatusBadge } from "../components/status-badge";
import { formatJoinCode } from "../lib/form";
import { stagger } from "../lib/motion";
import type { ManagedCourseSummary } from "../types";

export function MyCoursesPage({ data }: { data: { courses: ManagedCourseSummary[] } }) {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Kelola course"
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

      {data.courses.length === 0 ? (
        <Empty className="min-h-96 border bg-muted/30">
          <EmptyIllustration alt="" width={1254} height={1254} className="max-w-56" />
          <EmptyHeader>
            <EmptyTitle>Kamu belum membuat course</EmptyTitle>
            <EmptyDescription>
              Buat course pertamamu, isi dengan materi dan kuis, lalu undang siswa dengan kode kelas.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/manage/courses/new" />}>
              <Plus data-icon="inline-start" />
              Buat course
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <section aria-label="Daftar course yang dikelola" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.courses.map((course, index) => (
            <Card key={course.id} data-testid="managed-course" className="enter-up h-full" style={stagger(index)}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={course.status} />
                  <Badge variant="outline">{course.subjectName}</Badge>
                </div>
                <CardTitle className="font-heading text-lg text-pretty wrap-break-word">{course.name}</CardTitle>
                {course.description ? (
                  <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-4">
                <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" aria-hidden="true" />
                    {course.studentCount} siswa
                  </span>
                  <span>{course.quizCount} kuis</span>
                  <span>{course.assignmentCount} assignment</span>
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    Kode kelas:{" "}
                    {course.joinCode ? (
                      <span className="font-mono font-medium tracking-widest text-foreground">
                        {formatJoinCode(course.joinCode)}
                      </span>
                    ) : (
                      "dimatikan"
                    )}
                  </span>
                  <Button size="sm" render={<Link to={`/manage/courses/${course.id}`} />}>
                    Kelola
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

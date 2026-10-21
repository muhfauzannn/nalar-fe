import { ArrowRight, KeyRound, Plus, Users } from "lucide-react";
import { Link } from "react-router";

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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Kelola course
          </h1>
          <p className="leading-relaxed text-muted-foreground text-pretty">
            Course yang kamu buat. Tambahkan materi, kuis, dan assignment, lalu bagikan kode kelas
            agar orang lain bisa bergabung.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link to="/courses/join" />}>
            <KeyRound data-icon="inline-start" />
            Gabung dengan kode
          </Button>
          <Button render={<Link to="/manage/courses/new" />}>
            <Plus data-icon="inline-start" />
            Buat course
          </Button>
        </div>
      </header>

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
        <section aria-label="Daftar course yang dikelola" className="grid gap-5 md:grid-cols-2">
          {data.courses.map((course, index) => (
            <Card key={course.id} data-testid="managed-course" className="enter-up" style={stagger(index)}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={course.status} />
                  <Badge variant="outline">{course.subjectName}</Badge>
                </div>
                <CardTitle className="font-heading text-xl">{course.name}</CardTitle>
                {course.description ? (
                  <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" aria-hidden="true" />
                    {course.studentCount} siswa
                  </span>
                  <span>{course.quizCount} kuis</span>
                  <span>{course.assignmentCount} assignment</span>
                </dl>
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

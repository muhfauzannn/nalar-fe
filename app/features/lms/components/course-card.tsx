import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "~/components/ui/progress";
import type { CourseSummary } from "../types";

export function CourseCard({
  course,
  variant = "compact",
}: {
  course: CourseSummary;
  variant?: "compact" | "detailed";
}) {
  if (variant === "compact") return <CompactCourseCard course={course} />;
  return <DetailedCourseCard course={course} />;
}

function CompactCourseCard({ course }: { course: CourseSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{course.name}</CardTitle>
        <CardDescription>{course.subjectName}</CardDescription>
        <CardAction>
          <Badge variant={course.status === "archived" ? "outline" : "secondary"}>
            {course.status === "archived" ? "Arsip" : course.subjectCode}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {course.description ?? "Materi dan aktivitas pembelajaran course."}
        </p>
        <Progress value={course.progress.percentage}>
          <ProgressLabel>Progres</ProgressLabel>
          <ProgressValue>
            {() => `${course.progress.percentage}%`}
          </ProgressValue>
        </Progress>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="size-4" aria-hidden="true" />
            <span>{course.progress.lessons.total} materi</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClipboardCheck className="size-4" aria-hidden="true" />
            <span>
              {course.progress.assignments.total + course.progress.quizzes.total} tugas
            </span>
          </div>
          <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            <span>
              {course.progress.completed} dari {course.progress.total} aktivitas selesai
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" render={<Link to={`/courses/${course.id}`} />}>
          Buka course
          <ArrowRight data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function DetailedCourseCard({ course }: { course: CourseSummary }) {
  const assessmentTotal =
    course.progress.assignments.total + course.progress.quizzes.total;
  const assessmentCompleted =
    course.progress.assignments.completed + course.progress.quizzes.completed;
  const finished = course.progress.total > 0 && course.progress.percentage === 100;
  const archived = course.status === "archived";
  const actionLabel = archived
    ? "Lihat arsip"
    : course.progress.percentage > 0
      ? "Lanjutkan"
      : "Buka course";

  return (
    <article className="group h-full transition-transform duration-300 motion-safe:hover:-translate-y-0.5">
      <Card className="h-full">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="mint">{course.subjectCode}</Badge>
            {archived && <Badge variant="outline">Arsip</Badge>}
            {finished && !archived && <Badge variant="outline">Selesai</Badge>}
          </div>
          <CardTitle>{course.name}</CardTitle>
          <CardDescription>{course.subjectName}</CardDescription>
          <CardAction>
            <span className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
              {course.progress.percentage}%
            </span>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-5">
          <p className="line-clamp-2 min-h-10 text-sm/relaxed text-muted-foreground">
            {course.description ?? "Materi dan aktivitas pembelajaran course."}
          </p>

          <Progress
            value={course.progress.percentage}
            aria-label={`Progres ${course.name} ${course.progress.percentage}%`}
          >
            <ProgressLabel>Progres course</ProgressLabel>
            <ProgressValue>
              {() => `${course.progress.completed}/${course.progress.total}`}
            </ProgressValue>
          </Progress>

          <dl className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-2">
            <CourseMetric
              icon={BookOpen}
              value={`${course.progress.lessons.completed}/${course.progress.lessons.total}`}
              label="Materi"
            />
            <CourseMetric
              icon={ClipboardCheck}
              value={`${assessmentCompleted}/${assessmentTotal}`}
              label="Tugas"
            />
            <CourseMetric
              icon={CheckCircle2}
              value={`${course.progress.completed}/${course.progress.total}`}
              label="Selesai"
            />
          </dl>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            variant={archived ? "outline" : "default"}
            render={<Link to={`/courses/${course.id}`} />}
          >
            {actionLabel}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
}

function CourseMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-center">
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      <dt className="text-[0.7rem] text-muted-foreground">{label}</dt>
      <dd className="font-heading text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

import { ArrowRight, BookOpen, ClipboardCheck } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
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

/** The one course card, used on the dashboard and on "Course saya". */
export function CourseCard({ course }: { course: CourseSummary }) {
  const assessmentTotal =
    course.progress.assignments.total + course.progress.quizzes.total;
  const finished = course.progress.total > 0 && course.progress.percentage === 100;
  const archived = course.status === "archived";
  const actionLabel = archived
    ? "Lihat arsip"
    : course.progress.percentage > 0
      ? "Lanjutkan"
      : "Buka course";

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge variant="mint">{course.subjectCode}</Badge>
          {archived && <Badge variant="outline">Arsip</Badge>}
          {finished && !archived && <Badge variant="outline">Selesai</Badge>}
        </div>
        <CardTitle className="text-pretty break-words">{course.name}</CardTitle>
        <CardDescription>{course.subjectName}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        <p className="line-clamp-2 text-sm/relaxed text-muted-foreground">
          {course.description ?? "Materi dan aktivitas pembelajaran course."}
        </p>

        <div className="mt-auto flex flex-col gap-3">
          <Progress
            value={course.progress.percentage}
            aria-label={`Progres ${course.name} ${course.progress.percentage}%`}
          >
            <ProgressLabel>Progres</ProgressLabel>
            <ProgressValue>
              {() => `${course.progress.completed}/${course.progress.total} · ${course.progress.percentage}%`}
            </ProgressValue>
          </Progress>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-4" aria-hidden="true" />
              {course.progress.lessons.total} materi
            </span>
            <span className="flex items-center gap-1.5">
              <ClipboardCheck className="size-4" aria-hidden="true" />
              {assessmentTotal} tugas & kuis
            </span>
          </p>
        </div>
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
  );
}

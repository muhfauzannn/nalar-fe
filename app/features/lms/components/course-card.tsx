import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck } from "lucide-react";
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

export function CourseCard({ course }: { course: CourseSummary }) {
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
            <BookOpen className="size-4" />
            <span>{course.progress.lessons.total} materi</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClipboardCheck className="size-4" />
            <span>
              {course.progress.assignments.total + course.progress.quizzes.total} tugas
            </span>
          </div>
          <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="size-4" />
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

import {
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock3,
  FileQuestion,
  Megaphone,
  Users,
} from "lucide-react";
import { Link } from "react-router";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "~/components/ui/progress";
import { formatDateTime, sentenceStatus } from "../lib/format";
import type { CourseData } from "../types";

export function CourseDetailPage({ data: loaderData }: { data: CourseData }) {
  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/courses" />}>Course</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{loaderData.course.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="lavender">{loaderData.course.subjectName}</Badge>
            {loaderData.course.status === "archived" && <Badge variant="outline">Arsip</Badge>}
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            {loaderData.course.name}
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            {loaderData.course.description ?? "Materi dan aktivitas pembelajaran course."}
          </p>
          {loaderData.teachers.length > 0 && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              {loaderData.teachers.join(", ")}
            </p>
          )}
        </div>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Progres course</CardTitle>
            <CardDescription>
              {loaderData.progress.completed} dari {loaderData.progress.total} aktivitas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={loaderData.progress.percentage}>
              <ProgressLabel>Selesai</ProgressLabel>
              <ProgressValue>{() => `${loaderData.progress.percentage}%`}</ProgressValue>
            </Progress>
          </CardContent>
        </Card>
      </header>

      {loaderData.announcements.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-semibold">Pengumuman</h2>
          {loaderData.announcements.slice(0, 3).map((announcement) => (
            <Alert key={announcement.id}>
              <Megaphone />
              <AlertTitle>{announcement.title}</AlertTitle>
              <AlertDescription>{announcement.body}</AlertDescription>
            </Alert>
          ))}
        </section>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <section className="flex min-w-0 flex-col gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold">Materi course</h2>
            <p className="text-sm text-muted-foreground">Modul dan lesson yang sudah dipublikasikan.</p>
          </div>
          {loaderData.modules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Belum ada materi yang dipublikasikan.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Accordion multiple defaultValue={[loaderData.modules[0]?.id ?? ""]}>
                  {loaderData.modules.map((module) => (
                    <AccordionItem key={module.id} value={module.id}>
                      <AccordionTrigger>
                        <span className="flex min-w-0 items-start gap-3 pr-4">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                            <BookOpen className="size-4" />
                          </span>
                          <span>
                            <span className="block text-base">{module.title}</span>
                            <span className="mt-1 block font-normal text-muted-foreground">
                              {module.lessons.length} materi
                            </span>
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-2 pl-11">
                        {module.lessons.length === 0 ? (
                          <p className="text-muted-foreground">Belum ada lesson pada modul ini.</p>
                        ) : (
                          module.lessons.map((lesson) => (
                            <Link
                              key={lesson.id}
                              to={`/lessons/${lesson.id}`}
                              className="flex items-center justify-between gap-3 rounded-lg p-3 no-underline transition-colors hover:bg-accent"
                            >
                              <span className="flex items-center gap-3">
                                {lesson.status === "completed" ? (
                                  <CheckCircle2 className="size-4 text-brand-mint-foreground" />
                                ) : (
                                  <Circle className="size-4 text-muted-foreground" />
                                )}
                                {lesson.title}
                              </span>
                              <Badge variant="outline">{sentenceStatus(lesson.status)}</Badge>
                            </Link>
                          ))
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          <ActivityCard
            title="Assignment"
            description="Workflow belajar 5 tahap"
            icon={ClipboardList}
            empty="Belum ada assignment."
            items={loaderData.assignments.map((item) => ({
              id: item.id,
              href: `/assignments/${item.id}`,
              title: item.title,
              dueAt: item.dueAt,
              status: item.submissionStatus,
            }))}
          />
          <ActivityCard
            title="Quiz"
            description="Latihan yang dinilai otomatis"
            icon={FileQuestion}
            empty="Belum ada quiz."
            items={loaderData.quizzes.map((item) => ({
              id: item.id,
              href: `/quizzes/${item.id}`,
              title: item.title,
              dueAt: item.dueAt,
              status: item.attemptStatus,
              score: item.score,
            }))}
          />
        </aside>
      </div>
    </div>
  );
}

function ActivityCard({
  title,
  description,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  description: string;
  icon: typeof ClipboardList;
  items: Array<{
    id: string;
    href: string;
    title: string;
    dueAt: string | null;
    status: string | null;
    score?: string | null;
  }>;
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Icon className="size-5 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium leading-snug">{item.title}</p>
                {item.score ? <Badge variant="mint">{Number(item.score)}%</Badge> : null}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                {formatDateTime(item.dueAt)}
              </p>
              <Button size="sm" variant="outline" render={<Link to={item.href} />}>
                {sentenceStatus(item.status)}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

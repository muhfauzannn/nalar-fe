import {
  Archive,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock3,
  FileQuestion,
  Megaphone,
  PlayCircle,
  Route,
  Users,
} from "lucide-react";
import { Link } from "react-router";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
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
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "~/components/ui/progress";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import { formatDateTime, sentenceStatus } from "../lib/format";
import type { CourseData } from "../types";

const finishedActivityStatuses = new Set([
  "closed",
  "completed",
  "expired",
  "graded",
  "returned",
  "submitted",
]);

type ActivityItem = {
  id: string;
  href: string;
  title: string;
  dueAt: string | null;
  status: string | null;
  score?: string | null;
};

export function CourseDetailPage({ data: loaderData }: { data: CourseData }) {
  const nextAction = getNextAction(loaderData);

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/courses" />}>
              Course
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{loaderData.course.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <header className="relative isolate overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none">
          <div
            className="absolute -top-24 -left-24 size-72 rounded-full bg-secondary/10"
            aria-hidden="true"
          />
          <div
            className="absolute right-1/4 -bottom-32 size-80 rounded-full bg-brand-lavender-soft/10"
            aria-hidden="true"
          />

          <div className="relative grid min-h-[28rem] items-center gap-3 px-6 pt-8 pb-16 sm:px-9 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:px-12 lg:py-12">
            <div className="z-10 flex max-w-3xl flex-col items-start gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="mint">{loaderData.course.subjectName}</Badge>
                <span className="text-xs font-medium tracking-[0.16em] text-primary-foreground/60 uppercase">
                  {loaderData.course.subjectCode}
                </span>
                {loaderData.course.status === "archived" && (
                  <Badge
                    variant="outline"
                    className="border-primary-foreground/30 text-primary-foreground"
                  >
                    Arsip
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-brand-mint-soft">
                  Ruang belajar kamu
                </p>
                <h1 className="max-w-3xl font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                  {loaderData.course.name}
                </h1>
                <p className="max-w-2xl text-sm/relaxed text-primary-foreground/70 sm:text-base/relaxed">
                  {loaderData.course.description ??
                    "Ikuti materi dan aktivitas course secara bertahap sampai tuntas."}
                </p>
              </div>

              {loaderData.teachers.length > 0 && (
                <p className="flex items-center gap-2 text-sm text-primary-foreground/70">
                  <Users className="size-4" aria-hidden="true" />
                  <span>Pengajar: {loaderData.teachers.join(", ")}</span>
                </p>
              )}

              {nextAction ? (
                <div className="flex flex-col items-start gap-2">
                  <span className="text-xs font-medium tracking-wide text-primary-foreground/55 uppercase">
                    Langkah berikutnya
                  </span>
                  <Button
                    variant="secondary"
                    size="lg"
                    render={<Link to={nextAction.href} />}
                  >
                    {nextAction.label}
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                  <p className="max-w-md text-sm text-primary-foreground/60">
                    {nextAction.title}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 px-4 py-3">
                  <CheckCircle2
                    className="size-5 text-brand-mint-soft"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-primary-foreground/80">
                    {loaderData.progress.total > 0
                      ? "Semua aktivitas yang tersedia sudah kamu selesaikan."
                      : "Aktivitas course akan muncul di sini setelah dipublikasikan."}
                  </p>
                </div>
              )}
            </div>

            <div className="relative mx-auto flex w-full max-w-sm items-center justify-center self-end lg:max-w-md lg:self-center">
              <img
                src="/illustration/plane.svg"
                width={700}
                height={700}
                alt=""
                aria-hidden="true"
                className="pointer-events-none aspect-square w-full select-none object-contain motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-700 motion-reduce:animate-none"
              />
              <div className="absolute right-0 bottom-12 left-0 mx-auto w-[min(17rem,90%)] rounded-2xl border border-border/60 bg-background/95 p-4 text-foreground shadow-lg backdrop-blur-sm">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Progres course
                    </p>
                    <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                      {loaderData.progress.percentage}%
                    </p>
                  </div>
                  <p className="text-right text-xs text-muted-foreground">
                    {loaderData.progress.completed}/{loaderData.progress.total}{" "}
                    aktivitas
                  </p>
                </div>
                <Progress
                  value={loaderData.progress.percentage}
                  aria-label={`Progres course ${loaderData.progress.percentage}%`}
                >
                  <ProgressLabel className="sr-only">
                    Progres course
                  </ProgressLabel>
                  <ProgressValue className="sr-only">
                    {() => `${loaderData.progress.percentage}%`}
                  </ProgressValue>
                </Progress>
              </div>
            </div>
          </div>
        </header>

        <CourseMetrics data={loaderData} />
      </div>

      {loaderData.course.status === "archived" && (
        <Alert>
          <Archive />
          <AlertTitle>Course ini telah diarsipkan</AlertTitle>
          <AlertDescription>
            Kamu masih dapat membaca materi, tetapi aktivitas baru tidak lagi
            ditambahkan.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-10">
        <CourseModules data={loaderData} />

        <aside className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-24">
          <ActivityPanel
            assignments={loaderData.assignments.map((item) => ({
              id: item.id,
              href: `/assignments/${item.id}`,
              title: item.title,
              dueAt: item.dueAt,
              status: item.submissionStatus,
            }))}
            quizzes={loaderData.quizzes.map((item) => ({
              id: item.id,
              href: `/quizzes/${item.id}`,
              title: item.title,
              dueAt: item.dueAt,
              status: item.attemptStatus,
              score: item.score,
            }))}
          />
          {loaderData.announcements.length > 0 && (
            <Announcements items={loaderData.announcements.slice(0, 3)} />
          )}
        </aside>
      </div>
    </div>
  );
}

function CourseMetrics({ data }: { data: CourseData }) {
  const metrics = [
    {
      label: "Materi selesai",
      value: `${data.progress.lessons.completed}/${data.progress.lessons.total}`,
      icon: BookOpen,
    },
    {
      label: "Assignment selesai",
      value: `${data.progress.assignments.completed}/${data.progress.assignments.total}`,
      icon: ClipboardList,
    },
    {
      label: "Quiz selesai",
      value: `${data.progress.quizzes.completed}/${data.progress.quizzes.total}`,
      icon: FileQuestion,
    },
    {
      label: "Total progres",
      value: `${data.progress.percentage}%`,
      icon: Route,
    },
  ];

  return (
    <Card className="relative z-10 mx-4 -mt-8 sm:mx-8 lg:mx-12">
      <CardContent className="grid grid-cols-2 p-0 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }, index) => (
          <div
            key={label}
            className={`flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5 ${
              index % 2 !== 0 ? "border-l" : ""
            } ${index >= 2 ? "border-t lg:border-t-0" : ""} ${index > 0 ? "lg:border-l" : ""}`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-heading text-lg font-semibold tabular-nums sm:text-xl">
                {value}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {label}
              </span>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CourseModules({ data }: { data: CourseData }) {
  return (
    <section
      className="flex min-w-0 flex-col gap-5"
      aria-labelledby="course-materials-title"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-brand-lavender-foreground">
            Learning path
          </p>
          <h2
            id="course-materials-title"
            className="font-heading text-2xl font-semibold tracking-tight"
          >
            Materi course
          </h2>
          <p className="text-sm text-muted-foreground">
            Selesaikan lesson secara bertahap sesuai urutan modul.
          </p>
        </div>
        <Badge variant="outline">{data.modules.length} modul</Badge>
      </div>

      {data.modules.length === 0 ? (
        <Card>
          <CardContent>
            <Empty className="border-0 py-10">
              <EmptyIllustration alt="Kucing Bernalar mencari materi di dalam kotak" />
              <EmptyHeader>
                <EmptyTitle>Materi belum tersedia</EmptyTitle>
                <EmptyDescription>
                  Pengajar belum mempublikasikan modul untuk course ini.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Accordion multiple defaultValue={[data.modules[0]?.id ?? ""]}>
              {data.modules.map((module, moduleIndex) => {
                const completedLessons = module.lessons.filter(
                  (lesson) => lesson.status === "completed",
                ).length;

                return (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger className="py-5 hover:no-underline">
                      <span className="flex min-w-0 flex-1 items-start gap-4 pr-4">
                        <span className="font-heading text-2xl leading-none font-semibold text-muted-foreground/50 tabular-nums sm:text-3xl">
                          {String(moduleIndex + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base leading-snug font-semibold text-foreground">
                            {module.title}
                          </span>
                          <span className="mt-1 block font-normal text-muted-foreground">
                            {module.description ??
                              `${module.lessons.length} lesson tersedia`}
                          </span>
                        </span>
                        <Badge
                          variant={
                            completedLessons === module.lessons.length &&
                            module.lessons.length > 0
                              ? "mint"
                              : "outline"
                          }
                        >
                          {completedLessons}/{module.lessons.length}
                        </Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 pl-0 sm:pl-14">
                      {module.lessons.length === 0 ? (
                        <Empty className="border border-dashed py-6">
                          <EmptyMedia variant="icon">
                            <BookOpen />
                          </EmptyMedia>
                          <EmptyHeader>
                            <EmptyTitle>Lesson belum tersedia</EmptyTitle>
                            <EmptyDescription>
                              Konten untuk modul ini belum dipublikasikan.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      ) : (
                        <div className="flex flex-col gap-2 border-t pt-3">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <Link
                              key={lesson.id}
                              to={`/lessons/${lesson.id}`}
                              className="group flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-foreground no-underline! transition-all hover:bg-accent hover:no-underline! active:translate-y-px"
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <LessonStatusIcon status={lesson.status} />
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">
                                    {lesson.title}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    Lesson {lessonIndex + 1}
                                  </span>
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <Badge
                                  variant={
                                    lesson.status === "completed"
                                      ? "mint"
                                      : "outline"
                                  }
                                  className="hidden sm:inline-flex"
                                >
                                  {sentenceStatus(lesson.status)}
                                </Badge>
                                <ArrowRight
                                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                                  aria-hidden="true"
                                />
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function LessonStatusIcon({
  status,
}: {
  status: CourseData["modules"][number]["lessons"][number]["status"];
}) {
  if (status === "completed") {
    return (
      <CheckCircle2
        className="size-5 shrink-0 text-brand-mint-foreground"
        aria-hidden="true"
      />
    );
  }

  if (status === "in_progress") {
    return (
      <PlayCircle
        className="size-5 shrink-0 text-brand-lavender-foreground"
        aria-hidden="true"
      />
    );
  }

  return (
    <Circle
      className="size-5 shrink-0 text-muted-foreground"
      aria-hidden="true"
    />
  );
}

function ActivityPanel({
  assignments,
  quizzes,
}: {
  assignments: ActivityItem[];
  quizzes: ActivityItem[];
}) {
  const hasActivities = assignments.length > 0 || quizzes.length > 0;
  const defaultTab = assignments.length > 0 ? "assignments" : "quizzes";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivitas</CardTitle>
        <CardDescription>
          Assignment dan quiz yang terhubung dengan course.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasActivities ? (
          <Empty className="border border-dashed py-7">
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>Belum ada aktivitas</EmptyTitle>
              <EmptyDescription>
                Assignment dan quiz akan muncul setelah dipublikasikan.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Tabs defaultValue={defaultTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assignments">
                <ClipboardList data-icon="inline-start" />
                Assignment
                <Badge variant="secondary">{assignments.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="quizzes">
                <FileQuestion data-icon="inline-start" />
                Quiz
                <Badge variant="secondary">{quizzes.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="assignments">
              <ActivityTab
                items={assignments}
                icon={ClipboardList}
                title="Belum ada assignment"
                description="Assignment akan muncul setelah dipublikasikan."
              />
            </TabsContent>
            <TabsContent value="quizzes">
              <ActivityTab
                items={quizzes}
                icon={FileQuestion}
                title="Belum ada quiz"
                description="Quiz akan muncul setelah dipublikasikan."
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityTab({
  items,
  icon: Icon,
  title,
  description,
}: {
  items: ActivityItem[];
  icon: typeof ClipboardList;
  title: string;
  description: string;
}) {
  if (items.length === 0) {
    return (
      <Empty className="mt-3 border border-dashed py-7">
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ScrollArea className={cn("mt-3 pr-3", items.length > 3 && "h-96")}>
      <div className="flex flex-col divide-y">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 py-4 first:pt-1 last:pb-0"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 font-medium leading-snug">{item.title}</p>
              {item.score !== null && item.score !== undefined ? (
                <Badge variant="mint">{Number(item.score)}%</Badge>
              ) : null}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {formatDateTime(item.dueAt)}
            </p>
            <Button
              variant="outline"
              className="w-full justify-between"
              render={<Link to={item.href} />}
            >
              {sentenceStatus(item.status)}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function Announcements({ items }: { items: CourseData["announcements"] }) {
  return (
    <section
      className="rounded-2xl border bg-secondary/30 p-5"
      aria-labelledby="announcements-title"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Megaphone className="size-4" aria-hidden="true" />
        </span>
        <h2 id="announcements-title" className="font-heading font-semibold">
          Pengumuman
        </h2>
      </div>
      <div className="flex flex-col gap-4">
        {items.map((item, index) => (
          <div key={item.id}>
            {index > 0 && <Separator className="mb-4" />}
            <p className="font-medium leading-snug">{item.title}</p>
            <p className="mt-1 text-sm/relaxed text-muted-foreground">
              {item.body}
            </p>
            {item.publishedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDateTime(item.publishedAt)}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function getNextAction(data: CourseData) {
  const lessons = data.modules.flatMap((module) => module.lessons);
  const nextLesson = lessons.find((lesson) => lesson.status !== "completed");

  if (nextLesson) {
    return {
      href: `/lessons/${nextLesson.id}`,
      label:
        nextLesson.status === "in_progress"
          ? "Lanjutkan materi"
          : "Mulai materi",
      title: nextLesson.title,
    };
  }

  if (data.course.status !== "archived") {
    const nextAssignment = data.assignments.find(
      (item) =>
        !finishedActivityStatuses.has(item.submissionStatus ?? item.status),
    );
    if (nextAssignment) {
      return {
        href: `/assignments/${nextAssignment.id}`,
        label: "Kerjakan assignment",
        title: nextAssignment.title,
      };
    }

    const nextQuiz = data.quizzes.find(
      (item) =>
        !finishedActivityStatuses.has(item.attemptStatus ?? item.status),
    );
    if (nextQuiz) {
      return {
        href: `/quizzes/${nextQuiz.id}`,
        label: "Mulai quiz",
        title: nextQuiz.title,
      };
    }
  }

  return null;
}

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
  Users,
} from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
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
      <PageHeader
        crumbs={[{ label: "Course saya", to: "/courses" }]}
        eyebrow={
          <>
            <Badge variant="mint">{loaderData.course.subjectName}</Badge>
            {loaderData.course.status === "archived" && <Badge variant="outline">Arsip</Badge>}
          </>
        }
        title={loaderData.course.name}
        description={
          loaderData.course.description ??
          "Ikuti materi dan aktivitas course secara bertahap sampai tuntas."
        }
        meta={
          loaderData.teachers.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="size-4" aria-hidden="true" />
              Pengajar: {loaderData.teachers.join(", ")}
            </span>
          )
        }
      />

      <CourseProgress data={loaderData} nextAction={nextAction} />

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

// The only place the course's progress is shown: overall, per activity type,
// and what to do next.
function CourseProgress({
  data,
  nextAction,
}: {
  data: CourseData;
  nextAction: ReturnType<typeof getNextAction>;
}) {
  const metrics = [
    { label: "Materi", progress: data.progress.lessons, icon: BookOpen },
    { label: "Assignment", progress: data.progress.assignments, icon: ClipboardList },
    { label: "Quiz", progress: data.progress.quizzes, icon: FileQuestion },
  ];

  return (
    <Card>
      <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] md:items-center md:gap-8">
        <div className="flex min-w-0 flex-col gap-4">
          <Progress
            value={data.progress.percentage}
            aria-label={`Progres course ${data.progress.percentage}%`}
          >
            <ProgressLabel className="flex items-baseline gap-2">
              <span className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
                {data.progress.percentage}%
              </span>
              <span className="text-sm font-normal text-muted-foreground">progres course</span>
            </ProgressLabel>
            <ProgressValue className="text-sm">
              {() => `${data.progress.completed}/${data.progress.total} aktivitas`}
            </ProgressValue>
          </Progress>
          <dl className="grid grid-cols-3 gap-3">
            {metrics.map(({ label, progress, icon: Icon }) => (
              <div key={label} className="flex min-w-0 flex-col gap-1">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </dt>
                <dd className="font-heading text-lg font-semibold tabular-nums">
                  {progress.completed}/{progress.total}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col items-start gap-3 border-t pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-8">
          {nextAction ? (
            <>
              <p className="text-xs font-medium text-muted-foreground">Langkah berikutnya</p>
              <p className="font-medium text-pretty">{nextAction.title}</p>
              <Button render={<Link to={nextAction.href} />}>
                {nextAction.label}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </>
          ) : (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-mint-foreground" aria-hidden="true" />
              {data.progress.total > 0
                ? "Semua aktivitas yang tersedia sudah kamu selesaikan."
                : "Aktivitas course akan muncul di sini setelah dipublikasikan."}
            </p>
          )}
        </div>
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
                        <span className="w-8 shrink-0 font-heading text-2xl leading-none font-semibold text-muted-foreground tabular-nums sm:w-10 sm:text-3xl">
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
                              className="group flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-foreground no-underline! transition-colors hover:bg-accent hover:no-underline!"
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

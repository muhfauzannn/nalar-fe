import {
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileQuestion,
} from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "~/components/ui/empty";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import { formatDateTime, sentenceStatus } from "../lib/format";

type ActivityItem = {
  id: string;
  href: string;
  title: string;
  dueAt: string | null;
  status: string | null;
  score?: string | null;
};
type ActivityKind = "assignment" | "quiz";
const submittedStatuses = new Set([
  "submitted",
  "returned",
  "completed",
  "graded",
]);

export function CourseActivityPanel({
  assignments,
  quizzes,
}: {
  assignments: ActivityItem[];
  quizzes: ActivityItem[];
}) {
  const hasActivities = assignments.length > 0 || quizzes.length > 0;
  return (
    <Card size="sm" aria-labelledby="course-activities-title">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-lavender-soft p-4">
          <CardTitle
            id="course-activities-title"
            className="group-data-[size=sm]/card:text-xl"
          >
            Aktivitas
          </CardTitle>
          <img
            src="/illustration/chalkboard.svg"
            width={1254}
            height={1254}
            alt=""
            aria-hidden="true"
            className="size-24 shrink-0 object-contain"
          />
        </div>
      </CardHeader>
      <CardContent className="@container/activity">
        {!hasActivities ? (
          <ActivityEmpty
            title="Belum ada aktivitas"
            description="Assignment dan quiz akan muncul setelah dipublikasikan."
          />
        ) : (
          <Tabs defaultValue={assignments.length ? "assignments" : "quizzes"}>
            <TabsList
              className="grid w-full grid-cols-[1.25fr_1fr]"
              aria-label="Jenis aktivitas"
            >
              <TabsTrigger
                value="assignments"
                className="@max-[19rem]/activity:text-xs"
              >
                <ClipboardList
                  data-icon="inline-start"
                  className="@max-[19rem]/activity:hidden"
                />
                Assignment<Badge variant="lavender">{assignments.length}</Badge>
              </TabsTrigger>
              <TabsTrigger
                value="quizzes"
                className="@max-[19rem]/activity:text-xs"
              >
                <FileQuestion
                  data-icon="inline-start"
                  className="@max-[19rem]/activity:hidden"
                />
                Quiz<Badge variant="mint">{quizzes.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="assignments">
              <ActivityList items={assignments} kind="assignment" />
            </TabsContent>
            <TabsContent value="quizzes">
              <ActivityList items={quizzes} kind="quiz" />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className="border-0 px-2 py-6">
      <EmptyIllustration alt="" className="size-28" />
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function ActivityList({
  items,
  kind,
}: {
  items: ActivityItem[];
  kind: ActivityKind;
}) {
  if (!items.length)
    return (
      <ActivityEmpty
        title={
          kind === "assignment" ? "Belum ada assignment" : "Belum ada quiz"
        }
        description="Aktivitas akan muncul setelah dipublikasikan oleh pengajar."
      />
    );
  return (
    <ScrollArea className={cn("mt-3", items.length > 3 && "h-[30rem] pr-3")}>
      <div className="flex flex-col gap-3 p-px">
        {items.map((item) => (
          <ActivityNote key={item.id} item={item} kind={kind} />
        ))}
      </div>
    </ScrollArea>
  );
}

function ActivityNote({
  item,
  kind,
}: {
  item: ActivityItem;
  kind: ActivityKind;
}) {
  const active = item.status === "in_progress";
  const submitted = submittedStatuses.has(item.status ?? "");
  const closed = item.status === "closed" || item.status === "expired";
  const quiz = kind === "quiz";
  const Icon = quiz ? FileQuestion : ClipboardList;
  const date = item.dueAt ? new Date(item.dueAt) : null;
  const dateValid = date && Number.isFinite(date.getTime());
  const score =
    item.score !== null &&
    item.score !== undefined &&
    Number.isFinite(Number(item.score))
      ? Number(item.score)
      : null;
  const actionLabel = active
    ? "Lanjutkan"
    : submitted
      ? quiz
        ? "Lihat hasil"
        : "Lihat pekerjaan"
      : closed
        ? "Lihat detail"
        : quiz
          ? "Mulai quiz"
          : "Kerjakan assignment";
  const datePart = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("id-ID", {
      ...options,
      timeZone: "Asia/Jakarta",
    }).format(date!);

  return (
    <article
      className={cn(
        "group/activity relative overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] duration-150 focus-within:ring-2 focus-within:ring-ring/40 motion-reduce:transition-none",
        active
          ? "border-brand-lavender shadow-sm"
          : "border-border hover:border-ring/40",
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          submitted || quiz ? "bg-brand-mint" : "bg-brand-lavender",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "absolute top-0 right-0 size-5 [clip-path:polygon(0_0,100%_100%,100%_0)]",
          quiz ? "bg-brand-mint-soft" : "bg-brand-lavender-soft",
        )}
      />
      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className={cn(
            "flex w-13 shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 py-2.5",
            quiz
              ? "bg-brand-mint-soft text-brand-mint-foreground"
              : "bg-brand-lavender-soft text-brand-lavender-foreground",
          )}
        >
          {dateValid ? (
            <time
              dateTime={item.dueAt!}
              aria-label={`Tenggat ${formatDateTime(item.dueAt)}`}
              className="flex flex-col items-center"
            >
              <span className="font-heading text-2xl leading-none font-semibold tabular-nums">
                {datePart({ day: "2-digit" })}
              </span>
              <span className="mt-1 text-[11px] font-medium">
                {datePart({ month: "short" })}
              </span>
              <span className="text-[10px]">
                {datePart({ year: "numeric" })}
              </span>
            </time>
          ) : (
            <>
              <CalendarDays className="my-1 size-5" aria-hidden="true" />
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={submitted ? "mint" : active ? "lavender" : "outline"}
            >
              {submitted ? <Check data-icon="inline-start" /> : null}
              {sentenceStatus(item.status)}
            </Badge>
            {score !== null ? (
              <Badge variant="mint">Skor {score}%</Badge>
            ) : null}
          </div>
          <h3 className="font-heading text-sm leading-relaxed font-medium wrap-break-word">
            {item.title}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
            {dateValid
              ? `Pukul ${datePart({ hour: "2-digit", minute: "2-digit" })} WIB`
              : "Tanpa tenggat"}
          </p>
        </div>
      </div>
      <div className="mx-4 border-t border-dashed py-2">
        <Link
          to={item.href}
          aria-label={`${actionLabel}: ${item.title}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full justify-between",
          )}
        >
          <span className="flex items-center gap-2">
            <Icon data-icon="inline-start" />
            {actionLabel}
          </span>
          <ChevronRight data-icon="inline-end" />
        </Link>
      </div>
    </article>
  );
}

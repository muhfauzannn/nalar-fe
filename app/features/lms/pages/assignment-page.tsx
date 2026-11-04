import {
  Activity,
  ArrowRight,
  Brain,
  CalendarClock,
  CalendarX2,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TimerOff,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Form, Link, useNavigation } from "react-router";

import { enterSilentZone } from "~/features/game-feel";

import { PageHeader } from "~/components/layout/page-header";
import { MathText } from "~/components/math-text";
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
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Progress, ProgressLabel, ProgressValue } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { formatDateTime } from "../lib/format";
import { pointCopy, postKinds, postNames } from "../lib/game";
import type { AssignmentData, EarnedPoint, OffloadingLevel, OffloadingResult, WorkflowStage } from "../types";
import { AccessNotice, contactTeacher, datedFact, noticeFacts, type Notice } from "../components/access-notice";
import { AiTutorPanel } from "../components/ai-tutor-panel";
import { EvaluationMarks } from "../components/evaluation-marks";
import { PostTrack } from "../components/post-track";
import { useHostedTutor } from "../components/tutor-host";
import { useWritingSignals, writingSignalsKey } from "../hooks/use-writing-signals";
import { assignmentDraftKey, readActivityDraft, writeActivityDraft } from "../lib/activity-drafts";
import { marksReady } from "../lib/evaluation-marks";

const stageCopy: Record<
  WorkflowStage,
  {
    number: string;
    title: string;
    shortTitle: string;
    prompt: string;
    guidance: string;
  }
> = {
  "1_independent_effort": {
    number: "01",
    title: postNames["1_independent_effort"],
    shortTitle: "Mandiri",
    prompt: "Tuliskan jawaban atau pemahaman awalmu",
    guidance: "Fokus pada cara berpikirmu saat ini. Jawaban belum harus sempurna.",
  },
  "2_guided_questioning": {
    number: "02",
    title: postNames["2_guided_questioning"],
    shortTitle: "Bertanya",
    prompt: "Diskusikan pertanyaanmu bersama NALAR",
    guidance: "Minta petunjuk atau umpan balik. NALAR menjaga agar pekerjaan tetap milikmu.",
  },
  "3_ai_evaluation": {
    number: "03",
    title: postNames["3_ai_evaluation"],
    shortTitle: "Evaluasi",
    prompt: "Apa yang kuat, lemah, atau perlu diverifikasi dari bantuan AI?",
    guidance: "Jika tidak menggunakan AI, jelaskan alasan dan caramu memeriksa jawaban sendiri.",
  },
  "4_revision_finalization": {
    number: "04",
    title: postNames["4_revision_finalization"],
    shortTitle: "Revisi",
    prompt: "Perbaiki drafmu menjadi jawaban final",
    guidance: "Drafmu dari Pos 1 sudah ada di sini. Ubah yang perlu berubah, lalu periksa dengan rubrik.",
  },
  "5_reflection": {
    number: "05",
    title: postNames["5_reflection"],
    shortTitle: "Refleksi",
    prompt: "Apa yang berubah dalam pemahaman dan proses belajarmu?",
    guidance: "Bandingkan draf awal dan jawaban finalmu di atas.",
  },
};

// The world's own call to action, as on the island's post sheet.
const mintButton = "bg-brand-mint font-bold text-brand-mint-ink hover:bg-brand-mint/90";

// A ruled page: the lines scroll with the writing.
const bookPaper =
  "min-h-24 flex-1 resize-none rounded-none border-0 bg-transparent bg-[repeating-linear-gradient(transparent,transparent_calc(1.75rem-1px),#e8dfca_calc(1.75rem-1px),#e8dfca_1.75rem)] bg-local px-1 py-0 leading-7 shadow-none focus-visible:shadow-[inset_0_-2px_0_var(--brand-mint)] focus-visible:ring-0 dark:bg-transparent";

const terminalErrorCodes = new Set([
  "ASSIGNMENT_ENROLLMENT_INACTIVE",
  "ASSIGNMENT_NOT_AVAILABLE",
  "ASSIGNMENT_SUBMISSION_EXPIRED",
  "ASSIGNMENT_SUBMISSION_SUBMITTED",
]);

export function AssignmentPage({
  data: loaderData,
  actionError,
  actionCode,
  actionDraft,
  actionStage,
  earned = [],
  embedded = false,
  returnTo,
  lab,
}: {
  data: AssignmentData;
  embedded?: boolean;
  /** The lab where Pos 3 can test what the tutor said. */
  lab?: { href: string; title: string };
  returnTo?: string;
  earned?: EarnedPoint[];
  actionError?: string;
  actionCode?: string;
  actionDraft?: string;
  actionStage?: string;
}) {
  const navigation = useNavigation();
  const working = navigation.state === "submitting";
  const submission = loaderData.submission;
  const finished = submission?.status === "submitted" || submission?.status === "returned";
  const terminalActionError = actionCode ? terminalErrorCodes.has(actionCode) : false;
  const canContinue = Boolean(
    submission?.status === "in_progress" &&
      loaderData.canContinue &&
      !terminalActionError,
  );
  const activeStage = canContinue ? submission?.currentStage : undefined;
  const completedStages = submission?.stages.filter((stage) => stage.status === "completed").length ?? 0;

  // In the classroom the task is an open book: it fits the surface and holds only what a post needs.
  if (embedded && (canContinue || finished || (!submission && loaderData.canStart && !terminalActionError))) {
    return (
      <div className="@container h-full">
        {!submission ? (
          <BookStart data={loaderData} working={working} />
        ) : finished ? (
          <BookDone data={loaderData} />
        ) : (
          <AssignmentWorkspace
            assignment={loaderData}
            working={working}
            actionDraft={actionStage === submission.currentStage ? actionDraft : undefined}
            lab={lab}
            book={{ earned, error: terminalActionError ? undefined : actionError }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="@container w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-8 @5xl:gap-10">
        {embedded ? (
          <header className="flex flex-col gap-2">
            <h2 className="font-heading text-xl font-semibold">{loaderData.title}</h2>
            {!activeStage && <div className="text-sm leading-relaxed"><MathText>{loaderData.instructions}</MathText></div>}
            <p className="text-xs text-muted-foreground">{completedStages} dari 5 pos menyala</p>
          </header>
        ) : <AssignmentHeader
          data={loaderData}
          working={Boolean(activeStage)}
          finished={finished}
          completedStages={completedStages}
        />}

        {earned.length > 0 && <EarnedPoints earned={earned} courseId={loaderData.courseId} assignmentId={loaderData.id} returnTo={returnTo} />}

        {actionError && !terminalActionError && (
          <Alert variant="destructive">
            <AlertTitle>Perubahan belum tersimpan</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {!submission ? (
          loaderData.canStart && !terminalActionError ? (
            <AssignmentStartPanel data={loaderData} working={working} />
          ) : (
            <AssignmentUnavailable data={loaderData} message={actionError} />
          )
        ) : finished ? (
          <SubmissionResult assignment={loaderData} returnTo={returnTo} />
        ) : canContinue ? (
          <AssignmentWorkspace
            assignment={loaderData}
            working={working}
            actionDraft={actionStage === submission.currentStage ? actionDraft : undefined}
            lab={lab}
          />
        ) : (
          <AssignmentUnavailable data={loaderData} message={actionError} />
        )}
      </div>
    </div>
  );
}

// What the stage just completed earned, shown once after the redirect.
function EarnedPoints({ earned, courseId, assignmentId, returnTo }: { earned: EarnedPoint[]; courseId: string; assignmentId: string; returnTo?: string }) {
  const total = earned.reduce((sum, item) => sum + item.points, 0);
  return (
    <section
      aria-live="polite"
      className="flex animate-in items-center gap-4 rounded-2xl bg-brand-mint-soft p-4 text-brand-mint-foreground shadow-card duration-300 fade-in-0 slide-in-from-top-2 sm:p-5"
    >
      <img src="/game/coin.webp" alt="" width={125} height={128} className="size-12 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-heading font-semibold tabular-nums">+{total} Poin Nalar</p>
        <p className="text-sm opacity-85">{earned.map((item) => pointCopy[item.kind].title).join(" · ")}</p>
      </div>
      <Button variant="outline" size="sm" render={<Link to={returnTo ?? `/courses/${courseId}/balai/${assignmentId}`} />}>
        {returnTo ? "Kembali ke kelas" : "Lihat balai"}
      </Button>
    </section>
  );
}

function AssignmentHeader({
  data,
  working,
  finished,
  completedStages,
}: {
  data: AssignmentData;
  working: boolean;
  finished: boolean;
  completedStages: number;
}) {
  return (
    <PageHeader
      crumbs={[
        { label: "Dunia", to: "/dunia" },
        { label: data.courseName, to: `/courses/${data.courseId}` },
      ]}
      eyebrow={
        <>
          <Badge variant="lavender">Tugas</Badge>
          {finished && <Badge variant="mint">Sudah dikumpulkan</Badge>}
          {working && <Badge variant="outline">Sedang dikerjakan</Badge>}
        </>
      }
      title={data.title}
      description={
        working ? undefined : (
          <span className="whitespace-pre-wrap">
            <MathText>{data.instructions}</MathText>
          </span>
        )
      }
      meta={
        <>
          <span className="flex items-center gap-1.5 tabular-nums">
            <Clock3 className="size-4" aria-hidden="true" />
            Tenggat {formatDateTime(data.dueAt)}
          </span>
          {!working && (
            <>
              <span className="flex items-center gap-1.5 tabular-nums">
                <LockKeyhole className="size-4" aria-hidden="true" />
                Ditutup {formatDateTime(data.closesAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <ListChecks className="size-4" aria-hidden="true" />
                {data.criteria.length} kriteria rubrik
              </span>
            </>
          )}
          {data.submission && !finished && (
            <span className="flex items-center gap-1.5 tabular-nums">
              <FileCheck2 className="size-4" aria-hidden="true" />
              {completedStages} dari 5 pos menyala
            </span>
          )}
        </>
      }
    />
  );
}

function AssignmentStartPanel({ data, working }: { data: AssignmentData; working: boolean }) {
  return (
    <section className="grid grid-flow-dense items-start gap-5 @5xl:grid-cols-12">
      <Card className="@5xl:col-span-8">
        <CardHeader>
          <CardTitle>Lima pos</CardTitle>
        </CardHeader>
        <CardContent>
          <PostTrack posts={(Object.keys(stageCopy) as WorkflowStage[]).map((stage) => ({ stage, status: "locked" }))} />
        </CardContent>
      </Card>

      <Card className="@5xl:col-span-4">
        <CardHeader>
          <CardTitle>Rubrik</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RubricAccordion criteria={data.criteria} compact />
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            Tugas ini dikumpulkan sekali. Progres tersimpan di setiap pos.
          </p>
        </CardContent>
        <CardFooter>
          <Form method="post" className="w-full">
            <input type="hidden" name="intent" value="start" />
            <Button type="submit" className={cn("w-full", mintButton)} disabled={working}>
              {working && <Spinner data-icon="inline-start" />}
              {working ? "Membuka tugas..." : "Mulai dari Pos 1"}
              {!working && <ArrowRight data-icon="inline-end" />}
            </Button>
          </Form>
        </CardFooter>
      </Card>
    </section>
  );
}

// The desk: one sheet of work under the path it belongs to, with the task and the rubric at hand.
function AssignmentWorkspace({
  assignment,
  working,
  actionDraft,
  lab,
  book,
}: {
  assignment: AssignmentData;
  working: boolean;
  actionDraft?: string;
  lab?: { href: string; title: string };
  book?: { earned: EarnedPoint[]; error?: string };
}) {
  const submission = assignment.submission;
  const guidedQuestioning = submission?.currentStage === "2_guided_questioning";
  // In the classroom the tutor spirit takes the guided questioning instead of a panel here.
  const tutorHosted = useHostedTutor(
    submission && guidedQuestioning
      ? { key: `assignment:${submission.id}`, label: `Tugas ${assignment.title}`, target: { targetType: "assignment", targetId: submission.id } }
      : null,
  );
  const completedCount = submission?.stages.filter((stage) => stage.status === "completed").length ?? 0;
  // A post completed without leaving this page (the classroom's book) lights up here.
  const [seenCount, setSeenCount] = useState(completedCount);
  const lit = completedCount > seenCount ? submission?.stages[completedCount - 1]?.stage ?? null : null;
  const onLit = useCallback(() => setSeenCount(completedCount), [completedCount]);
  if (!submission) return null;

  if (book) {
    const gain = book.earned.reduce((sum, item) => sum + item.points, 0);
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <header className="flex items-center gap-3 p-1">
          <h2 className="min-w-0 flex-1 truncate font-heading text-base font-bold">{assignment.title}</h2>
          {gain > 0 && (
            <p aria-live="polite" className="flex shrink-0 items-center gap-1 rounded-full bg-brand-mint-soft px-2 py-0.5 text-xs font-bold text-brand-mint-foreground tabular-nums">
              <img src="/game/coin.webp" alt="" width={125} height={128} className="size-4" />
              +{gain}
              <span className="sr-only">Poin Nalar</span>
            </p>
          )}
          <div className="w-36 shrink-0 @lg:w-44">
            <PostTrack small posts={submission.stages} lit={lit} onLit={onLit} />
          </div>
        </header>
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-3 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @3xl:grid-rows-[minmax(0,1fr)] @3xl:gap-0">
          <BookSheets key={submission.currentStage} assignment={assignment} stage={submission.currentStage} />
          <section aria-label="Lembar kerja" className="flex min-h-0 flex-col gap-2 @3xl:pl-6">
            {book.error && <p role="alert" className="text-sm text-destructive">{book.error}</p>}
            <ActiveStage assignment={assignment} working={working} actionDraft={actionDraft} tutorHosted={tutorHosted} lighting={lit !== null} lab={lab} book />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 @4xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-label="Perjalanan tugas" className="rounded-3xl bg-brand-lavender-soft/60 px-2 py-4 @4xl:col-span-2 sm:px-4">
        <PostTrack posts={submission.stages} lit={lit} onLit={onLit} />
      </section>
      <Card size="sm" className="@4xl:col-start-2 @4xl:row-start-2">
        <CardHeader>
          <CardTitle>Soal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-56 overflow-y-auto text-sm/relaxed whitespace-pre-wrap @4xl:max-h-[50vh]">
            <MathText>{assignment.instructions}</MathText>
          </div>
        </CardContent>
      </Card>
      <div className="min-w-0 @4xl:col-start-1 @4xl:row-span-3 @4xl:row-start-2">
        <ActiveStage assignment={assignment} working={working} actionDraft={actionDraft} tutorHosted={tutorHosted} lighting={lit !== null} lab={lab} />
      </div>
      {guidedQuestioning && !tutorHosted && (
        <div className="min-w-0 @4xl:col-start-2">
          <AiTutorPanel target={{ targetType: "assignment", targetId: submission.id }} />
        </div>
      )}
      <Card size="sm" className="@4xl:col-start-2">
        <CardHeader>
          <CardTitle>Rubrik</CardTitle>
          <CardDescription>Periksa sebelum menyalakan pos.</CardDescription>
        </CardHeader>
        <CardContent>
          <RubricAccordion criteria={assignment.criteria} compact />
        </CardContent>
      </Card>
    </div>
  );
}

// The book's left page: the sheets a post needs, one at a time. On a phone there is one page, so
// the sheets stay closed until the student opens one and the writing keeps the room.
function BookSheets({ assignment, stage }: { assignment: AssignmentData; stage: WorkflowStage }) {
  const [open, setOpen] = useState<string | null>(null);
  const submission = assignment.submission;
  if (!submission) return null;
  const text = (from: WorkflowStage) => <p className="break-words whitespace-pre-wrap">{artifactOf(submission, from)}</p>;
  const task = { id: "soal", label: "Soal", body: <div className="whitespace-pre-wrap"><MathText>{assignment.instructions}</MathText></div> };
  const draft = { id: "draf", label: "Draf awal", body: text("1_independent_effort") };
  const rubric = { id: "rubrik", label: "Rubrik", body: <RubricAccordion criteria={assignment.criteria} compact /> };
  const sheets =
    stage === "5_reflection"
      ? [draft, { id: "final", label: "Jawaban final", body: text("4_revision_finalization") }, task]
      : stage === "4_revision_finalization"
        ? [task, { id: "evaluasi", label: "Evaluasi", body: text("3_ai_evaluation") }, draft, rubric]
        : stage === "1_independent_effort"
          ? [task, rubric]
          : [task, draft];
  const shown = sheets.filter((sheet) => sheet.id !== "rubrik" || assignment.criteria.length > 0);
  const current = shown.find((sheet) => sheet.id === open);
  const showing = current ?? shown[0]!;
  return (
    <section aria-label="Bahan" className="flex min-h-0 flex-col gap-2 @3xl:border-r @3xl:border-[#e8dfca] @3xl:pr-6 @3xl:shadow-[inset_-16px_0_16px_-16px_rgba(24,21,58,0.14)]">
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {shown.map((sheet) => (
          <button
            key={sheet.id}
            type="button"
            aria-pressed={sheet === showing}
            onClick={() => setOpen(sheet.id === open ? null : sheet.id)}
            className={cn(
              "min-h-9 rounded-full px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring",
              sheet === current && "bg-[#18153a] text-white",
              sheet === showing && sheet !== current && "@3xl:bg-[#18153a] @3xl:text-white",
              sheet !== current && "bg-[#f0e8d6]",
            )}
          >
            {sheet.label}
          </button>
        ))}
      </div>
      <div className={cn("max-h-40 min-h-0 overflow-y-auto text-sm/relaxed @3xl:block @3xl:max-h-none @3xl:flex-1", !current && "hidden")}>{showing.body}</div>
    </section>
  );
}

function BookStart({ data, working }: { data: AssignmentData; working: boolean }) {
  return (
    <div className="mx-auto flex h-full min-h-0 max-w-xl flex-col gap-3">
      <h2 className="font-heading text-lg font-bold">{data.title}</h2>
      <PostTrack posts={(Object.keys(stageCopy) as WorkflowStage[]).map((stage) => ({ stage, status: "locked" }))} />
      <div className="min-h-0 flex-1 overflow-y-auto text-sm/relaxed whitespace-pre-wrap"><MathText>{data.instructions}</MathText></div>
      <Form method="post">
        <input type="hidden" name="intent" value="start" />
        <Button type="submit" className={cn("w-full", mintButton)} disabled={working}>
          {working && <Spinner data-icon="inline-start" />}
          {working ? "Membuka tugas..." : "Mulai dari Pos 1"}
          {!working && <ArrowRight data-icon="inline-end" />}
        </Button>
      </Form>
    </div>
  );
}

// The report and the archive are long reading, so they keep their own page.
function BookDone({ data }: { data: AssignmentData }) {
  return (
    <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-3 text-center">
      <img src="/game/crystal.webp" alt="" width={185} height={240} className="h-16 w-auto" />
      <h2 className="font-heading text-lg font-bold">Lima pos menyala</h2>
      <p className="text-sm text-muted-foreground">{data.title} sudah dikumpulkan.</p>
      <Button className={cn("w-full", mintButton)} render={<Link to={`/assignments/${data.id}`} />}>Baca laporan dan jawabanmu</Button>
      <Button variant="outline" className="w-full" render={<Link to={`/courses/${data.courseId}/balai/${data.id}`} />}>Ke balai</Button>
    </div>
  );
}

function ActiveStage({
  assignment,
  working,
  actionDraft,
  tutorHosted,
  lighting,
  lab,
  book = false,
}: {
  assignment: AssignmentData;
  working: boolean;
  actionDraft?: string;
  tutorHosted: boolean;
  lighting: boolean;
  lab?: { href: string; title: string };
  /** On the classroom's book: no card, and the writing takes the rest of the page. */
  book?: boolean;
}) {
  const submission = assignment.submission;
  const stage = submission?.currentStage ?? "1_independent_effort";
  // Writing a stage is a silent zone: no game sound or vibration until it is left. It starts
  // once the post before it has finished lighting up.
  useEffect(() => (lighting ? undefined : enterSilentZone()), [stage, lighting]);
  // Sinyal 1: only the two texts the student writes on their own are recorded.
  const recorded = stage === "1_independent_effort" || stage === "4_revision_finalization";
  const writing = useWritingSignals(writingSignalsKey(submission?.id ?? "none", stage));
  const signalsField = useRef<HTMLInputElement>(null);
  if (!submission) return null;
  const copy = stageCopy[stage];
  const finalStage = stage === "5_reflection";
  const rewards = postKinds[stage].map((kind) => pointCopy[kind].title).join(" · ");
  const messages = submission.tutorMessages ?? [];
  const marking = stage === "3_ai_evaluation" && messages.some((message) => message.author === "tutor");
  const answer = {
    id: `content-${stage}`,
    name: "content",
    required: true,
    minLength: 10,
    defaultValue: actionDraft ?? readActivityDraft(assignmentDraftKey(submission.id, stage)) ?? (stage === "4_revision_finalization" ? artifactOf(submission, "1_independent_effort") : undefined),
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => writeActivityDraft(assignmentDraftKey(submission.id, stage), event.currentTarget.value),
    ...(recorded ? writing.bind : {}),
  };

  const work = (
        stage === "2_guided_questioning" ? (
          <div className={cn("flex flex-col", book ? "min-h-0 flex-1 justify-between gap-3" : "gap-5")}>
            <div>
              <p className="font-medium">{copy.prompt}</p>
              {!book && <p className="mt-1 text-sm/relaxed text-muted-foreground">{copy.guidance}</p>}
              {tutorHosted && <p className="mt-1 text-sm/relaxed text-muted-foreground">NALAR ada di kelas bersamamu. Panggil dari tombol tutor.</p>}
            </div>
            {!book && <PostRewards rewards={rewards} />}
            <Form method="post">
              <input type="hidden" name="intent" value="complete-stage" />
              <input type="hidden" name="submissionId" value={submission.id} />
              <input type="hidden" name="courseId" value={assignment.courseId} />
              <input type="hidden" name="stage" value={stage} />
              <input type="hidden" name="content" value="" />
              <Button type="submit" disabled={working} className={cn(book && "w-full", mintButton)}>
                {working ? <Spinner data-icon="inline-start" /> : <ArrowRight data-icon="inline-end" />}
                {working ? "Menyalakan pos..." : "Nyalakan pos"}
              </Button>
            </Form>
          </div>
        ) : marking ? (
          <EvaluationMarks messages={messages} draftKey={assignmentDraftKey(submission.id, stage)} lab={lab} book={book}>
            {({ content, marks }) => (
              <Form method="post" className={book ? "shrink-0" : "flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"}>
                <input type="hidden" name="intent" value="complete-stage" />
                <input type="hidden" name="submissionId" value={submission.id} />
                <input type="hidden" name="courseId" value={assignment.courseId} />
                <input type="hidden" name="stage" value={stage} />
                <input type="hidden" name="content" value={content} />
                {!book && <PostRewards rewards={rewards} />}
                <Button type="submit" disabled={working || !marksReady(marks)} className={cn("w-full", !book && "sm:w-auto sm:min-w-48 sm:shrink-0", mintButton)}>
                  {working ? <Spinner data-icon="inline-start" /> : <ArrowRight data-icon="inline-end" />}
                  {working ? "Menyalakan pos..." : "Nyalakan pos"}
                </Button>
              </Form>
            )}
          </EvaluationMarks>
        ) : (
          <Form
            method="post"
            className={book ? "flex min-h-0 flex-1 flex-col gap-2" : undefined}
            onSubmit={() => {
              if (recorded && signalsField.current) signalsField.current.value = writing.snapshot();
            }}
          >
            <input type="hidden" name="intent" value="complete-stage" />
            <input type="hidden" name="submissionId" value={submission.id} />
              <input type="hidden" name="courseId" value={assignment.courseId} />
            <input type="hidden" name="stage" value={stage} />
            <input ref={signalsField} type="hidden" name="signals" defaultValue="" />
            {book ? (
              <>
                <label htmlFor={`content-${stage}`} className="shrink-0 text-sm font-medium">{copy.prompt}</label>
                <Textarea key={`${stage}:${actionDraft ?? ""}`} {...answer} placeholder={copy.guidance} className={bookPaper} />
                {recorded && <p className="shrink-0 text-xs text-muted-foreground">Lama menulis, teks tempelan, dan pindah tab dicatat, bukan untuk nilai.</p>}
                {finalStage && <p className="shrink-0 text-xs text-muted-foreground">Setelah dikumpulkan, jawaban tidak bisa diubah.</p>}
                <Button type="submit" disabled={working} className={cn("w-full shrink-0", mintButton)}>
                  {working ? <Spinner data-icon="inline-start" /> : finalStage ? <Send data-icon="inline-end" /> : <ArrowRight data-icon="inline-end" />}
                  {working ? (finalStage ? "Mengumpulkan..." : "Menyalakan pos...") : finalStage ? "Kumpulkan tugas" : "Nyalakan pos"}
                </Button>
              </>
            ) : (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`content-${stage}`}>{copy.prompt}</FieldLabel>
                <Textarea
                  key={`${stage}:${actionDraft ?? ""}`}
                  {...answer}
                  rows={stage === "4_revision_finalization" ? 15 : 10}
                  placeholder="Tulis jawabanmu…"
                  className="min-h-56 resize-y bg-background text-base leading-relaxed sm:min-h-64"
                />
                <FieldDescription>{copy.guidance}</FieldDescription>
                {recorded ? (
                  <p className="flex gap-2 text-xs/relaxed text-muted-foreground">
                    <Activity className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      Di pos ini NALAR mencatat cara kamu menulis: lama menulis, banyak teks yang
                      ditempel, jeda panjang, dan berapa kali kamu pindah tab. Isi ketikanmu per tombol
                      tidak direkam. Catatan ini dipakai untuk laporan refleksimu, bukan untuk nilai.
                    </span>
                  </p>
                ) : null}
              </Field>

              {finalStage && (
                <Alert className="border-brand-lavender bg-brand-lavender-soft/50">
                  <ShieldCheck />
                  <AlertTitle>Pos terakhir</AlertTitle>
                  <AlertDescription>
                    Setelah dikumpulkan, semua jawaban tidak bisa diubah.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <PostRewards rewards={rewards} />
                <Button type="submit" disabled={working} className={cn("w-full sm:w-auto sm:min-w-48 sm:shrink-0", mintButton)}>
                  {working ? (
                    <Spinner data-icon="inline-start" />
                  ) : finalStage ? (
                    <Send data-icon="inline-end" />
                  ) : (
                    <ArrowRight data-icon="inline-end" />
                  )}
                  {working
                    ? finalStage
                      ? "Mengumpulkan..."
                      : "Menyalakan pos..."
                    : finalStage
                      ? "Kumpulkan tugas"
                      : "Nyalakan pos"}
                </Button>
              </div>
            </FieldGroup>
            )}
          </Form>
        )
  );

  if (book) {
    return (
      <>
        <div className="shrink-0">
          <p className="text-xs text-muted-foreground tabular-nums">Pos {Number(copy.number)} dari 5</p>
          <h3 className="font-heading text-lg font-bold">{copy.title}</h3>
        </div>
        {work}
      </>
    );
  }

  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader className="border-b">
        <p className="mb-1 text-xs font-medium text-muted-foreground tabular-nums">
          Pos {Number(copy.number)} dari 5
        </p>
        <CardTitle className="font-heading text-xl font-bold sm:text-2xl">{copy.title}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <EarlierWork key={stage} stage={stage} submission={submission} />
        {work}
      </CardContent>
    </Card>
  );
}

type Submission = NonNullable<AssignmentData["submission"]>;

// What this post can give, so the student knows what the path is asking for.
function PostRewards({ rewards }: { rewards: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <img src="/game/coin.webp" alt="" width={125} height={128} className="size-5 shrink-0" />
      <span>{rewards}</span>
    </p>
  );
}

function artifactOf(submission: Submission, stage: WorkflowStage) {
  return submission.artifacts.find((artifact) => artifact.stage === stage)?.content ?? "";
}

// What the earlier posts left behind: each post carries on the same work instead of starting blank.
function EarlierWork({ stage, submission }: { stage: WorkflowStage; submission: Submission }) {
  const draft = artifactOf(submission, "1_independent_effort");
  if (stage === "3_ai_evaluation") {
    const asked = submission.tutorMessages ?? [];
    const answered = asked.some((message) => message.author === "tutor");
    return (
      <Accordion multiple defaultValue={["tutor"]}>
        {!answered && (
          <EarlierItem value="tutor" title="Percakapanmu dengan NALAR">
            <TutorExchange messages={asked} />
          </EarlierItem>
        )}
        <EarlierItem value="draft" title="Draf awalmu">
          <EarlierText text={draft} />
        </EarlierItem>
      </Accordion>
    );
  }
  if (stage === "4_revision_finalization") {
    return (
      <Accordion multiple defaultValue={["evaluation"]}>
        <EarlierItem value="evaluation" title="Evaluasimu di Pos 3">
          <EarlierText text={artifactOf(submission, "3_ai_evaluation")} />
        </EarlierItem>
        <EarlierItem value="draft" title="Draf awalmu, sebelum diubah">
          <EarlierText text={draft} />
        </EarlierItem>
      </Accordion>
    );
  }
  if (stage === "5_reflection") {
    return (
      <div className="grid gap-4 @3xl:grid-cols-2">
        {[
          { title: "Draf awalmu", text: draft },
          { title: "Jawaban finalmu", text: artifactOf(submission, "4_revision_finalization") },
        ].map((side) => (
          <section key={side.title} aria-label={side.title} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-muted/60 p-4">
            <h3 className="text-sm font-medium">{side.title}</h3>
            <EarlierText text={side.text} />
          </section>
        ))}
      </div>
    );
  }
  return null;
}

function EarlierItem({ value, title, children }: { value: string; title: string; children: ReactNode }) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="hover:no-underline">{title}</AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}

function EarlierText({ text }: { text: string }) {
  return <p className="max-h-64 overflow-y-auto text-sm/relaxed break-words whitespace-pre-wrap">{text}</p>;
}

function TutorExchange({ messages }: { messages: NonNullable<Submission["tutorMessages"]> }) {
  if (messages.length === 0) return <p className="text-sm/relaxed text-muted-foreground">Kamu tidak bertanya ke NALAR di Pos 2.</p>;
  return (
    <ol className="flex max-h-80 flex-col gap-3 overflow-y-auto">
      {messages.map((message) => (
        <li key={message.id} data-author={message.author} className="text-sm/relaxed">
          <p className="text-xs font-medium text-muted-foreground">{message.author === "tutor" ? "NALAR" : "Kamu"}</p>
          <p className="break-words whitespace-pre-wrap">{message.content}</p>
        </li>
      ))}
    </ol>
  );
}

function RubricAccordion({
  criteria,
  compact = false,
}: {
  criteria: AssignmentData["criteria"];
  compact?: boolean;
}) {
  if (criteria.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada rubrik untuk tugas ini.</p>;
  }

  return (
    <Accordion multiple className="w-full">
      {criteria.map((criterion) => (
        <AccordionItem key={criterion.id} value={criterion.id}>
          <AccordionTrigger className={cn("hover:no-underline", compact && "py-3")}>
            <span className="flex min-w-0 flex-1 items-start justify-between gap-3 pr-3">
              <span className="text-left">{criterion.label}</span>
              <Badge variant="outline">{Number(criterion.maxPoints)} poin</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pr-8 text-sm/relaxed text-muted-foreground">
            {criterion.description}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

const offloadingLevelCopy: Record<
  OffloadingLevel,
  { title: string; caption: string; badge: "mint" | "lavender" | "outline" | "destructive" }
> = {
  "1_ai_as_tool": {
    title: "AI sebagai alat",
    caption: "Upaya awal kuat, pertanyaan reflektif, dan revisi yang substansial.",
    badge: "mint",
  },
  "2_ai_as_scaffold": {
    title: "AI sebagai penyangga",
    caption: "Bantuan AI signifikan, tetapi kamu tetap aktif mengevaluasi.",
    badge: "lavender",
  },
  "3_partial_offloading": {
    title: "Sebagian dialihkan",
    caption: "Sebagian penalaran didelegasikan dan revisi cenderung kosmetik.",
    badge: "outline",
  },
  "4_full_offloading": {
    title: "Sepenuhnya dialihkan",
    caption: "Upaya awal minim, prompt meminta jawaban, dan nyaris tanpa revisi.",
    badge: "destructive",
  },
};

function humanizeFactor(factor: string) {
  const label = factor.replace(/[_-]+/g, " ").trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function OffloadingReport({
  offloading,
  submissionId,
}: {
  offloading: OffloadingResult | null;
  submissionId: string;
}) {
  const navigation = useNavigation();
  const analyzing =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "analyze";

  if (!offloading) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Refleksi penggunaan AI</CardTitle>
          <CardDescription>
            Laporan ini menganalisis cara kamu memakai AI selama mengerjakan —
            terpisah dari nilai akademik.
          </CardDescription>
          <CardAction>
            <Badge variant="outline">
              <Brain data-icon="inline-start" />
              Belum tersedia
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4 rounded-2xl bg-muted/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm/relaxed text-muted-foreground">
              Analisis belum selesai dibuat. Coba buat ulang laporannya.
            </p>
            <Form method="post">
              <input type="hidden" name="intent" value="analyze" />
              <input type="hidden" name="submissionId" value={submissionId} />
              <Button type="submit" variant="outline" disabled={analyzing}>
                {analyzing ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCw data-icon="inline-start" />
                )}
                {analyzing ? "Menganalisis..." : "Buat laporan"}
              </Button>
            </Form>
          </div>
        </CardContent>
      </Card>
    );
  }

  const copy = offloadingLevelCopy[offloading.level];

  return (
    <Card className="overflow-hidden border-brand-lavender/60">
      <CardHeader className="border-b bg-brand-lavender-soft/40">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5" aria-hidden="true" />
          Refleksi penggunaan AI
        </CardTitle>
        <CardDescription>
          Umpan balik proses belajar dari AI — bukan nilai akademik dan tidak
          memengaruhi nilai.
        </CardDescription>
        <CardAction>
          <Badge variant={copy.badge}>{copy.title}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-2xl bg-muted/60 p-5 sm:flex-row sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-card text-foreground shadow-sm ring-1 ring-border/60">
            <Brain className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg font-semibold">{copy.title}</p>
            <p className="mt-1 text-sm/relaxed text-muted-foreground">{copy.caption}</p>
          </div>
          <div className="w-full sm:w-44">
            <Progress value={offloading.score}>
              <ProgressLabel>Ketergantungan AI</ProgressLabel>
              <ProgressValue>{() => `${Math.round(offloading.score)}/100`}</ProgressValue>
            </Progress>
          </div>
        </div>

        <p className="whitespace-pre-wrap text-sm/relaxed">{offloading.studentReport}</p>

        {offloading.factors.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Yang memengaruhi
            </p>
            <ul className="flex flex-col gap-3">
              {offloading.factors.map((factor) => {
                const pushesOffloading = factor.contribution > 0;
                return (
                  <li key={factor.factor} className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                        pushesOffloading
                          ? "bg-destructive/10 text-destructive"
                          : "bg-brand-mint-soft text-brand-mint-foreground",
                      )}
                    >
                      {pushesOffloading ? (
                        <TrendingUp className="size-4" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{humanizeFactor(factor.factor)}</p>
                      <p className="text-sm/relaxed text-muted-foreground">
                        {factor.plainExplanation}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {offloading.recommendations.length > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-mint/40 bg-brand-mint-soft/30 p-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="size-4" aria-hidden="true" />
              Rekomendasi
            </p>
            <ul className="flex flex-col gap-2">
              {offloading.recommendations.map((recommendation) => (
                <li key={recommendation} className="flex items-start gap-2 text-sm/relaxed">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-mint-foreground" aria-hidden="true" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Out of reach: not open yet, closed, the course went read-only, or the time to
 * finish an in-progress submission ran out. The header already shows the
 * tenggat, the close time and how many stages are done, so the notice only adds
 * what it does not (the opening time).
 */
function AssignmentUnavailable({
  data,
  message,
}: {
  data: AssignmentData;
  message?: string;
}) {
  const inProgress = data.submission?.status === "in_progress";
  const readOnly = data.availability === "read_only";
  let notice: Notice;

  if (inProgress && !readOnly) {
    notice = {
      tone: "danger",
      icon: TimerOff,
      title: "Waktu pengerjaan telah berakhir",
      description:
        message ??
        "Pos yang sudah menyala tetap tersimpan, tetapi tugas tidak dapat dilanjutkan setelah batas penutupan.",
    };
  } else if (readOnly) {
    notice = {
      tone: "neutral",
      icon: inProgress ? LockKeyhole : Eye,
      title: inProgress ? "Tugas hanya dapat dilihat" : "Course hanya dapat dilihat",
      description:
        message ??
        `Enrollment atau course sedang tidak aktif, jadi ${inProgress ? "tugas tidak bisa dilanjutkan" : "tugas ini tidak bisa dimulai"}.`,
      hint: contactTeacher,
    };
  } else if (data.availability === "upcoming") {
    notice = {
      tone: "upcoming",
      icon: CalendarClock,
      title: "Tugas belum dibuka",
      description: message ?? "Kamu bisa mulai mengerjakan begitu tugas dibuka.",
      facts: noticeFacts(datedFact("Dibuka", data.availableAt)),
    };
  } else {
    notice = {
      tone: "neutral",
      icon: CalendarX2,
      title: "Tugas sudah ditutup",
      description: message ?? "Tugas ini tidak lagi menerima jawaban baru.",
      hint: contactTeacher,
    };
  }

  return <AccessNotice notice={notice} courseId={data.courseId} />;
}

function SubmissionResult({ assignment, returnTo }: { assignment: AssignmentData; returnTo?: string }) {
  const submission = assignment.submission;
  if (!submission) return null;
  const returned = submission.status === "returned";

  return (
    <section className="grid items-start gap-6 @7xl:grid-cols-[minmax(0,1fr)_22rem] @7xl:gap-8">
      <div className="flex min-w-0 flex-col gap-5">
        <Alert className="border-brand-mint bg-brand-mint-soft/45">
          <CheckCircle2 />
          <AlertTitle>{returned ? "Tugas sudah dinilai" : "Tugas berhasil dikumpulkan"}</AlertTitle>
          <AlertDescription>
            Jawabanmu tersimpan pada {formatDateTime(submission.submittedAt)} dan kini hanya dapat dibaca.
          </AlertDescription>
        </Alert>

        <OffloadingReport
          offloading={submission.offloading}
          submissionId={submission.id}
        />

        {submission.assessment && (
          <Card>
            <CardHeader>
              <CardTitle>Penilaian akademik</CardTitle>
              <CardDescription>Nilai rubrik terpisah dari laporan penggunaan AI.</CardDescription>
              <CardAction>
                <Badge variant="mint">{Number(submission.assessment.score)} / 100</Badge>
              </CardAction>
            </CardHeader>
            {submission.assessment.feedback && (
              <CardContent>
                <div className="rounded-2xl bg-muted/70 p-5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Catatan pengajar</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm/relaxed">{submission.assessment.feedback}</p>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Arsip jawaban</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion multiple defaultValue={submission.artifacts.map((artifact) => artifact.stage)}>
              {submission.artifacts.map((artifact) => (
                <AccordionItem key={artifact.stage} value={artifact.stage}>
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-xl bg-brand-mint-soft text-brand-mint-foreground">
                        <Check className="size-4" aria-hidden="true" />
                      </span>
                      <span>{stageCopy[artifact.stage].title}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pl-11">
                    <p className="whitespace-pre-wrap text-sm/relaxed text-foreground">{artifact.content}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <aside className="@7xl:sticky @7xl:top-24">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan tugas</CardTitle>
            <CardDescription>Semua pos sudah dikunci.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {submission.stages.map((stage, index) => (
              <div key={stage.stage}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-mint-soft text-brand-mint-foreground">
                    <Check className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{stageCopy[stage.stage].title}</p>
                    <p className="text-xs text-muted-foreground">Menyala</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" className="w-full" render={<Link to={returnTo ?? `/courses/${assignment.courseId}`} />}>
              {returnTo ? "Kembali ke kelas" : "Kembali ke pulau"}
            </Button>
          </CardFooter>
        </Card>
      </aside>
    </section>
  );
}

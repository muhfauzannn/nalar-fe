import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  ListChecks,
  LockKeyhole,
  MessageCircleQuestion,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Form, Link, useNavigation } from "react-router";

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
import type { AssignmentData, WorkflowStage } from "../types";

const stageCopy: Record<
  WorkflowStage,
  {
    number: string;
    title: string;
    shortTitle: string;
    description: string;
    prompt: string;
    guidance: string;
  }
> = {
  "1_independent_effort": {
    number: "01",
    title: "Upaya mandiri",
    shortTitle: "Mandiri",
    description: "Mulai dari pemahamanmu sendiri sebelum meminta bantuan apa pun.",
    prompt: "Tuliskan jawaban atau pemahaman awalmu",
    guidance: "Fokus pada cara berpikirmu saat ini. Jawaban belum harus sempurna.",
  },
  "2_guided_questioning": {
    number: "02",
    title: "Pertanyaan terbimbing",
    shortTitle: "Bertanya",
    description: "Gunakan bantuan untuk memperluas cara berpikir, bukan mengambil jawaban jadi.",
    prompt: "Diskusikan pertanyaanmu bersama AI Tutor",
    guidance: "Tahap ini opsional dan dapat dilewati jika AI Tutor belum tersedia.",
  },
  "3_ai_evaluation": {
    number: "03",
    title: "Evaluasi jawaban AI",
    shortTitle: "Evaluasi",
    description: "Periksa kualitas, asumsi, dan batasan bantuan AI secara kritis.",
    prompt: "Apa yang kuat, lemah, atau perlu diverifikasi dari bantuan AI?",
    guidance: "Jika tidak menggunakan AI, jelaskan alasan dan caramu memeriksa jawaban sendiri.",
  },
  "4_revision_finalization": {
    number: "04",
    title: "Revisi dan finalisasi",
    shortTitle: "Finalisasi",
    description: "Susun jawaban final berdasarkan evaluasi dan keputusanmu sendiri.",
    prompt: "Tuliskan jawaban final assignment",
    guidance: "Pastikan jawaban final menjawab instruksi dan rubrik yang tersedia.",
  },
  "5_reflection": {
    number: "05",
    title: "Refleksi",
    shortTitle: "Refleksi",
    description: "Tutup proses dengan melihat perubahan pemahaman dan cara belajarmu.",
    prompt: "Apa yang berubah dalam pemahaman dan proses belajarmu?",
    guidance: "Setelah tahap ini dikumpulkan, jawaban tidak dapat diubah lagi.",
  },
};

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
}: {
  data: AssignmentData;
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

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-8 lg:gap-10">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to={`/courses/${loaderData.courseId}`} />}>
                {loaderData.courseName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{loaderData.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div>
          <AssignmentHeader data={loaderData} compact={Boolean(activeStage)} finished={finished} />
          {!activeStage && (
            <AssignmentOverviewRail
              data={loaderData}
              completedStages={completedStages}
            />
          )}
        </div>

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
          <SubmissionResult assignment={loaderData} />
        ) : canContinue ? (
          <AssignmentWorkspace
            assignment={loaderData}
            working={working}
            actionDraft={actionStage === submission.currentStage ? actionDraft : undefined}
          />
        ) : (
          <AssignmentUnavailable data={loaderData} message={actionError} />
        )}
      </div>
    </div>
  );
}

function AssignmentHeader({
  data,
  compact,
  finished,
}: {
  data: AssignmentData;
  compact: boolean;
  finished: boolean;
}) {
  if (compact) {
    return (
      <header className="flex flex-col gap-4 border-b pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="lavender">Assignment NALAR</Badge>
          <Badge variant="outline">
            <Clock3 data-icon="inline-start" />
            Tenggat {formatDateTime(data.dueAt)}
          </Badge>
        </div>
        <div className="flex max-w-5xl flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            {data.courseName} / Sedang dikerjakan
          </p>
          <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            {data.title}
          </h1>
          <p className="max-w-3xl whitespace-pre-wrap text-sm/relaxed text-muted-foreground sm:text-base/relaxed">
            {data.instructions}
          </p>
        </div>
      </header>
    );
  }

  const unavailable = !finished && data.availability !== "available";
  const illustration = finished
    ? "/illustration/plane.svg"
    : unavailable
      ? "/illustration/sleeping.svg"
      : "/illustration/decoration2.svg";
  const illustrationSize = finished || unavailable ? 1254 : 1402;
  const illustrationHeight = finished || unavailable ? 1254 : 1122;

  return (
    <header className="group relative isolate grid min-h-80 overflow-hidden rounded-3xl bg-primary px-6 py-9 text-primary-foreground sm:px-9 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)] lg:items-center lg:px-12 lg:py-10">
      <div aria-hidden="true" className="absolute -top-28 -left-24 size-72 rounded-full bg-secondary/10" />
      <div className="relative flex max-w-3xl flex-col items-start gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="lavender">Assignment NALAR</Badge>
          {finished && <Badge variant="mint">Sudah dikumpulkan</Badge>}
        </div>
        <p className="text-sm font-medium text-primary-foreground/60">
          {data.courseName} / Assignment
        </p>
        <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
          {data.title}
        </h1>
        <p className="max-w-2xl whitespace-pre-wrap text-sm/relaxed text-primary-foreground/70 sm:text-base/relaxed">
          {data.instructions}
        </p>
      </div>

      <div className="relative flex min-h-52 items-center justify-center lg:justify-end">
        <img
          src={illustration}
          width={illustrationSize}
          height={illustrationHeight}
          alt=""
          aria-hidden="true"
          className={cn(
            "pointer-events-none w-full select-none object-contain transition-transform duration-700 ease-out group-hover:scale-[1.03]",
            finished || unavailable ? "max-w-52 sm:max-w-60 lg:max-w-64" : "max-w-72 lg:max-w-80",
          )}
        />
        {!finished && !unavailable && (
          <div className="absolute inset-x-auto bottom-4 rounded-2xl border border-white/15 bg-primary/85 px-5 py-3 text-center shadow-lg backdrop-blur-sm">
            <span className="block font-heading text-2xl font-semibold">5 tahap</span>
            <span className="text-xs text-primary-foreground/65">Alur berpikir NALAR</span>
          </div>
        )}
      </div>
    </header>
  );
}

function AssignmentOverviewRail({
  data,
  completedStages,
}: {
  data: AssignmentData;
  completedStages: number;
}) {
  const metrics = [
    { label: "Tenggat", value: formatDateTime(data.dueAt), icon: Clock3 },
    { label: "Ditutup", value: formatDateTime(data.closesAt), icon: LockKeyhole },
    { label: "Kriteria", value: `${data.criteria.length} rubrik`, icon: ListChecks },
    {
      label: "Progres",
      value: data.submission ? `${completedStages} / 5 tahap` : "Belum dimulai",
      icon: FileCheck2,
    },
  ];

  return (
    <Card className="relative z-10 mx-4 -mt-7 sm:mx-8 lg:mx-12">
      <CardContent className="grid grid-cols-1 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }, index) => (
          <div
            key={label}
            className={cn(
              "flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5",
              index > 0 && "border-t sm:border-t-0",
              index % 2 !== 0 && "sm:border-l",
              index >= 2 && "sm:border-t lg:border-t-0",
              index > 0 && "lg:border-l",
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-heading text-sm font-semibold">{value}</span>
              <span className="block text-xs text-muted-foreground">{label}</span>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AssignmentStartPanel({ data, working }: { data: AssignmentData; working: boolean }) {
  return (
    <section className="grid grid-flow-dense items-stretch gap-5 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardHeader>
          <CardTitle>Yang akan kamu kerjakan</CardTitle>
          <CardDescription>
            Assignment diselesaikan melalui lima tahap berurutan agar proses berpikirmu terlihat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-5 sm:grid-cols-2">
            {Object.values(stageCopy).map((stage, index) => (
              <div
                key={stage.number}
                className={cn(
                  "flex items-start gap-3 border-b py-4",
                  index >= 3 && "sm:border-b-0",
                  index === 4 && "sm:col-span-2",
                )}
              >
                <span className="font-heading text-sm font-semibold text-muted-foreground/70">
                  {stage.number}
                </span>
                <div>
                  <p className="font-medium">{stage.title}</p>
                  <p className="mt-1 text-xs/relaxed text-muted-foreground">{stage.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Siap mulai?</CardTitle>
          <CardDescription>
            Progres tersimpan setiap kali satu tahap berhasil diselesaikan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-xl bg-brand-mint-soft p-4 text-brand-mint-foreground">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Satu submission
            </div>
            <p className="mt-1 text-xs/relaxed opacity-80">
              Periksa tenggat dan rubrik sebelum memulai.
            </p>
          </div>
          <RubricAccordion criteria={data.criteria} compact />
        </CardContent>
        <CardFooter>
          <Form method="post" className="w-full">
            <input type="hidden" name="intent" value="start" />
            <Button type="submit" className="w-full" disabled={working}>
              {working ? <Spinner data-icon="inline-start" /> : <ArrowRight data-icon="inline-end" />}
              {working ? "Membuka assignment..." : "Mulai mengerjakan"}
            </Button>
          </Form>
        </CardFooter>
      </Card>
    </section>
  );
}

function AssignmentWorkspace({
  assignment,
  working,
  actionDraft,
}: {
  assignment: AssignmentData;
  working: boolean;
  actionDraft?: string;
}) {
  const submission = assignment.submission;
  if (!submission) return null;
  const completedCount = submission.stages.filter((stage) => stage.status === "completed").length;

  return (
    <div className="flex flex-col gap-6">
      <StageNavigator assignment={assignment} completedCount={completedCount} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
        <ActiveStage assignment={assignment} working={working} actionDraft={actionDraft} />
        <aside className="flex flex-col gap-5 xl:sticky xl:top-24">
          <Card>
            <CardHeader>
              <CardTitle>Rubrik penilaian</CardTitle>
              <CardDescription>Gunakan sebagai checklist sebelum melanjutkan.</CardDescription>
            </CardHeader>
            <CardContent>
              <RubricAccordion criteria={assignment.criteria} />
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-lavender-soft text-brand-lavender-foreground">
                <RotateCcw className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium">Progres aman per tahap</p>
                <p className="mt-1 text-xs/relaxed text-muted-foreground">
                  Tahap yang sudah selesai tetap tersimpan jika halaman dimuat ulang.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StageNavigator({
  assignment,
  completedCount,
}: {
  assignment: AssignmentData;
  completedCount: number;
}) {
  const submission = assignment.submission;
  if (!submission) return null;
  const progress = (completedCount / submission.stages.length) * 100;

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <Progress value={progress} aria-label="Progres assignment">
          <ProgressLabel>Progres assignment</ProgressLabel>
          <ProgressValue>
            {() => `${completedCount} dari 5 tahap selesai`}
          </ProgressValue>
        </Progress>
        <div className="grid grid-cols-5 gap-2">
          {submission.stages.map((stage) => {
            const active = stage.status === "in_progress";
            const complete = stage.status === "completed";
            return (
              <div
                key={stage.stage}
                className="flex min-w-0 flex-col items-center gap-2 text-center"
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl border text-xs font-semibold transition-colors",
                    complete && "border-brand-mint bg-brand-mint-soft text-brand-mint-foreground",
                    active && "border-primary bg-primary text-primary-foreground",
                    stage.status === "locked" && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {complete ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : stage.status === "locked" ? (
                    <LockKeyhole className="size-3.5" aria-hidden="true" />
                  ) : (
                    stageCopy[stage.stage].number
                  )}
                </span>
                <span className={cn("hidden truncate text-xs sm:block", active ? "font-medium" : "text-muted-foreground")}>
                  {stageCopy[stage.stage].shortTitle}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveStage({
  assignment,
  working,
  actionDraft,
}: {
  assignment: AssignmentData;
  working: boolean;
  actionDraft?: string;
}) {
  const submission = assignment.submission;
  if (!submission) return null;
  const stage = submission.currentStage;
  const copy = stageCopy[stage];
  const finalStage = stage === "5_reflection";

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="font-heading">TAHAP {copy.number}</span>
          <span aria-hidden="true">/</span>
          <span>5 tahap</span>
        </div>
        <CardTitle className="text-xl sm:text-2xl">{copy.title}</CardTitle>
        <CardDescription className="max-w-2xl text-sm/relaxed">
          {copy.description}
        </CardDescription>
        <CardAction>
          <Badge variant="mint">Sedang dikerjakan</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="rounded-2xl bg-muted/70 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-foreground shadow-sm ring-1 ring-border/60">
              {stage === "2_guided_questioning" ? (
                <MessageCircleQuestion className="size-4" aria-hidden="true" />
              ) : (
                <Sparkles className="size-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="font-heading text-base font-semibold sm:text-lg">{copy.prompt}</p>
              <p className="mt-1 text-sm/relaxed text-muted-foreground">{copy.guidance}</p>
            </div>
          </div>
        </div>

        {stage === "2_guided_questioning" ? (
          <div className="flex flex-col gap-5">
            <Alert>
              <MessageCircleQuestion />
              <AlertTitle>AI Tutor belum tersedia untuk assignment ini</AlertTitle>
              <AlertDescription>
                Tahap opsional ini dapat dilewati. Sistem tidak akan membuat respons tutor palsu.
              </AlertDescription>
            </Alert>
            <Form method="post">
              <input type="hidden" name="intent" value="complete-stage" />
              <input type="hidden" name="submissionId" value={submission.id} />
              <input type="hidden" name="stage" value={stage} />
              <input type="hidden" name="content" value="" />
              <Button type="submit" disabled={working}>
                {working ? <Spinner data-icon="inline-start" /> : <ArrowRight data-icon="inline-end" />}
                {working ? "Menyimpan tahap..." : "Lanjut tanpa AI Tutor"}
              </Button>
            </Form>
          </div>
        ) : (
          <Form method="post">
            <input type="hidden" name="intent" value="complete-stage" />
            <input type="hidden" name="submissionId" value={submission.id} />
            <input type="hidden" name="stage" value={stage} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`content-${stage}`}>{copy.prompt}</FieldLabel>
                <Textarea
                  key={`${stage}:${actionDraft ?? ""}`}
                  id={`content-${stage}`}
                  name="content"
                  required
                  minLength={10}
                  rows={stage === "4_revision_finalization" ? 15 : 10}
                  defaultValue={actionDraft}
                  placeholder="Tulis jawabanmu dengan jelas dan spesifik di sini..."
                  className="min-h-56 resize-y bg-background text-base leading-relaxed sm:min-h-64"
                />
                <FieldDescription>
                  Minimal 10 karakter. Isi baru disimpan setelah tombol di bawah berhasil diproses.
                </FieldDescription>
              </Field>

              {finalStage && (
                <Alert className="border-brand-lavender bg-brand-lavender-soft/50">
                  <ShieldCheck />
                  <AlertTitle>Periksa sebelum mengumpulkan</AlertTitle>
                  <AlertDescription>
                    Ini adalah tahap terakhir. Setelah dikumpulkan, seluruh jawaban menjadi hanya-baca.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Tahap {copy.number} akan ditandai selesai setelah server mengonfirmasi.
                </p>
                <Button type="submit" disabled={working} className="sm:min-w-48">
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
                      : "Menyimpan tahap..."
                    : finalStage
                      ? "Kumpulkan assignment"
                      : "Simpan & lanjut"}
                </Button>
              </div>
            </FieldGroup>
          </Form>
        )}
      </CardContent>
    </Card>
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
    return <p className="text-sm text-muted-foreground">Belum ada rubrik untuk assignment ini.</p>;
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

function AssignmentUnavailable({
  data,
  message,
}: {
  data: AssignmentData;
  message?: string;
}) {
  const inProgress = data.submission?.status === "in_progress";
  const upcoming = data.availability === "upcoming";
  const title = inProgress
    ? "Waktu pengerjaan telah berakhir"
    : upcoming
      ? "Assignment belum dibuka"
      : data.availability === "read_only"
        ? "Course hanya dapat dilihat"
        : "Assignment sudah ditutup";
  const description = message
    ? message
    : inProgress
      ? "Tahap yang sudah selesai tetap tersimpan, tetapi submission tidak dapat dilanjutkan setelah batas penutupan."
      : upcoming
        ? `Assignment dapat mulai dikerjakan pada ${formatDateTime(data.availableAt)}.`
        : "Assignment ini tidak lagi menerima submission baru.";

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-10">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-heading text-xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-xl text-sm/relaxed text-muted-foreground">{description}</p>
        <Button type="button" variant="outline" className="mt-6" render={<Link to={`/courses/${data.courseId}`} />}>
          Kembali ke course
        </Button>
      </CardContent>
    </Card>
  );
}

function SubmissionResult({ assignment }: { assignment: AssignmentData }) {
  const submission = assignment.submission;
  if (!submission) return null;
  const returned = submission.status === "returned";

  return (
    <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
      <div className="flex min-w-0 flex-col gap-5">
        <Alert className="border-brand-mint bg-brand-mint-soft/45">
          <CheckCircle2 />
          <AlertTitle>{returned ? "Assignment sudah dinilai" : "Assignment berhasil dikumpulkan"}</AlertTitle>
          <AlertDescription>
            Submission tersimpan pada {formatDateTime(submission.submittedAt)} dan kini hanya dapat dibaca.
          </AlertDescription>
        </Alert>

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
            <CardDescription>Lihat kembali hasil dari setiap tahap yang menghasilkan jawaban.</CardDescription>
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

      <aside className="xl:sticky xl:top-24">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan submission</CardTitle>
            <CardDescription>Semua tahap telah dikunci.</CardDescription>
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
                    <p className="text-xs text-muted-foreground">Selesai</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" className="w-full" render={<Link to={`/courses/${assignment.courseId}`} />}>
              Kembali ke course
            </Button>
          </CardFooter>
        </Card>
      </aside>
    </section>
  );
}

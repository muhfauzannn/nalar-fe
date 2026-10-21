import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  MessageCircleQuestion,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Form, Link, useNavigation } from "react-router";

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
import type { AssignmentData, OffloadingLevel, OffloadingResult, WorkflowStage } from "../types";
import { AiTutorPanel } from "../components/ai-tutor-panel";

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
    guidance: "Minta petunjuk atau umpan balik. Tutor akan menjaga agar pekerjaan tetap milikmu.",
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
        <AssignmentHeader
          data={loaderData}
          working={Boolean(activeStage)}
          finished={finished}
          completedStages={completedStages}
        />

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
        { label: "Course saya", to: "/courses" },
        { label: data.courseName, to: `/courses/${data.courseId}` },
      ]}
      eyebrow={
        <>
          <Badge variant="lavender">Assignment</Badge>
          {finished && <Badge variant="mint">Sudah dikumpulkan</Badge>}
          {working && <Badge variant="outline">Sedang dikerjakan</Badge>}
        </>
      }
      title={data.title}
      description={
        <span className="whitespace-pre-wrap">
          <MathText>{data.instructions}</MathText>
        </span>
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
              {completedStages} dari 5 tahap selesai
            </span>
          )}
        </>
      }
    />
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
                <span className="font-heading text-sm font-semibold text-muted-foreground tabular-nums">
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
            <p className="mt-1 text-xs/relaxed">
              Periksa tenggat dan rubrik sebelum memulai.
            </p>
          </div>
          <RubricAccordion criteria={data.criteria} compact />
        </CardContent>
        <CardFooter>
          <Form method="post" className="w-full">
            <input type="hidden" name="intent" value="start" />
            <Button type="submit" className="w-full" disabled={working}>
              {working && <Spinner data-icon="inline-start" />}
              {working ? "Membuka assignment..." : "Mulai mengerjakan"}
              {!working && <ArrowRight data-icon="inline-end" />}
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
  const guidedQuestioning = submission.currentStage === "2_guided_questioning";

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[13.5rem_minmax(0,1fr)_23rem]">
      <StageNavigator assignment={assignment} completedCount={completedCount} />
      <div className="order-1 min-w-0 xl:order-2">
        <ActiveStage assignment={assignment} working={working} actionDraft={actionDraft} />
      </div>
      <aside className="order-3 flex min-w-0 flex-col gap-5 xl:sticky xl:top-24">
        {guidedQuestioning && (
          <AiTutorPanel
            target={{ targetType: "assignment", targetId: submission.id }}
          />
        )}
        <Card>
          <CardHeader>
            <CardTitle>Rubrik penilaian</CardTitle>
            <CardDescription>Gunakan sebagai checklist sebelum melanjutkan.</CardDescription>
          </CardHeader>
          <CardContent>
            <RubricAccordion criteria={assignment.criteria} />
          </CardContent>
        </Card>
      </aside>
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
    <aside
      className="order-2 min-w-0 xl:order-1 xl:sticky xl:top-24"
      aria-label="Tahapan assignment"
    >
      <Card size="sm">
        <CardHeader>
          <CardTitle>Alur assignment</CardTitle>
          <CardDescription>Selesaikan tahap secara berurutan.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Progress value={progress} aria-label="Progres assignment">
            <ProgressLabel>Progres</ProgressLabel>
            <ProgressValue>
              {() => `${completedCount} dari 5 tahap selesai`}
            </ProgressValue>
          </Progress>
          <ol className="flex flex-col">
            {submission.stages.map((stage, index) => {
              const active = stage.status === "in_progress";
              const complete = stage.status === "completed";
              return (
                <li key={stage.stage} aria-current={active ? "step" : undefined}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold transition-colors",
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
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate text-sm",
                          active ? "font-medium" : "text-muted-foreground",
                        )}
                      >
                        {stageCopy[stage.stage].shortTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {complete ? "Selesai" : active ? "Sedang dikerjakan" : "Terkunci"}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </aside>
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
            <Form method="post">
              <input type="hidden" name="intent" value="complete-stage" />
              <input type="hidden" name="submissionId" value={submission.id} />
              <input type="hidden" name="stage" value={stage} />
              <input type="hidden" name="content" value="" />
              <Button type="submit" disabled={working}>
                {working ? <Spinner data-icon="inline-start" /> : <ArrowRight data-icon="inline-end" />}
                {working ? "Menyimpan tahap..." : "Selesai dan lanjutkan"}
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

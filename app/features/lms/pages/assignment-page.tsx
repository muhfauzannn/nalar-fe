import { Check, Circle, Clock3, LockKeyhole } from "lucide-react";
import { Form, Link, useNavigation } from "react-router";

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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import type { AssignmentData, WorkflowStage } from "../types";
import { formatDateTime } from "../lib/format";

const stageCopy: Record<
  WorkflowStage,
  { title: string; description: string; prompt: string }
> = {
  "1_independent_effort": {
    title: "Upaya mandiri",
    description: "Tuliskan pemahaman atau jawaban awal dengan pemikiranmu sendiri.",
    prompt: "Jawaban awal",
  },
  "2_guided_questioning": {
    title: "Pertanyaan terbimbing",
    description: "Tahap opsional untuk berdiskusi dengan AI Tutor tanpa meminta jawaban jadi.",
    prompt: "Pertanyaan untuk tutor",
  },
  "3_ai_evaluation": {
    title: "Evaluasi jawaban AI",
    description: "Nilai kekuatan, kelemahan, atau catat bahwa kamu tidak menggunakan AI Tutor.",
    prompt: "Hasil evaluasi",
  },
  "4_revision_finalization": {
    title: "Revisi dan finalisasi",
    description: "Susun jawaban final setelah mengevaluasi proses berpikirmu.",
    prompt: "Jawaban final",
  },
  "5_reflection": {
    title: "Refleksi",
    description: "Jelaskan apa yang berubah dalam pemahaman dan cara belajarmu.",
    prompt: "Refleksi belajar",
  },
};

export function AssignmentPage({
  data: loaderData,
  actionError,
}: {
  data: AssignmentData;
  actionError?: string;
}) {
  const navigation = useNavigation();
  const working = navigation.state === "submitting";
  const submission = loaderData.submission;

  return (
    <div className="flex flex-col gap-7">
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

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="lavender">Assignment NALAR</Badge>
          <Badge variant="outline">
            <Clock3 data-icon="inline-start" />
            {formatDateTime(loaderData.dueAt)}
          </Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {loaderData.title}
        </h1>
        <p className="max-w-3xl whitespace-pre-wrap text-muted-foreground">
          {loaderData.instructions}
        </p>
      </header>

      {actionError && (
        <Alert variant="destructive">
          <AlertTitle>Assignment belum dapat diproses</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {!submission ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Mulai assignment</CardTitle>
            <CardDescription>
              Pengerjaan terdiri dari lima tahap berurutan. Progres disimpan setiap tahap selesai.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post">
              <input type="hidden" name="intent" value="start" />
              <Button type="submit" disabled={working}>
                {working && <Spinner data-icon="inline-start" />}
                Mulai mengerjakan
              </Button>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <main className="min-w-0">
            {submission.status === "submitted" || submission.status === "returned" ? (
              <SubmissionResult assignment={loaderData} />
            ) : (
              <ActiveStage assignment={loaderData} working={working} />
            )}
          </main>
          <aside className="flex flex-col gap-5">
            <Card>
              <CardHeader>
                <CardTitle>Alur pengerjaan</CardTitle>
                <CardDescription>Tahap dibuka secara berurutan.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {submission.stages.map((stage) => (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {stage.status === "completed" ? (
                        <Check className="size-4" />
                      ) : stage.status === "locked" ? (
                        <LockKeyhole className="size-4 text-muted-foreground" />
                      ) : (
                        <Circle className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{stageCopy[stage.stage].title}</p>
                      <p className="text-xs text-muted-foreground">
                        {stage.status === "completed"
                          ? "Selesai"
                          : stage.status === "in_progress"
                            ? "Sedang dikerjakan"
                            : "Terkunci"}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Rubrik</CardTitle>
                <CardDescription>Kriteria akademik assignment.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {loaderData.criteria.map((criterion) => (
                  <div key={criterion.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{criterion.label}</p>
                      <Badge variant="outline">{Number(criterion.maxPoints)} poin</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {criterion.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

function ActiveStage({ assignment, working }: { assignment: AssignmentData; working: boolean }) {
  const submission = assignment.submission;
  if (!submission) return null;
  const stage = submission.currentStage;
  const copy = stageCopy[stage];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
        <CardAction>
          <Badge variant="mint">
            Tahap {stage.split("_")[0]} dari 5
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {stage === "2_guided_questioning" ? (
          <div className="flex flex-col gap-5">
            <Alert>
              <AlertTitle>AI Tutor belum dikonfigurasi</AlertTitle>
              <AlertDescription>
                Kamu boleh melanjutkan tanpa AI. Tidak ada respons tutor palsu yang ditampilkan.
              </AlertDescription>
            </Alert>
            <Form method="post">
              <input type="hidden" name="submissionId" value={submission.id} />
              <input type="hidden" name="stage" value={stage} />
              <input type="hidden" name="content" value="" />
              <Button type="submit" disabled={working}>
                {working && <Spinner data-icon="inline-start" />}
                Lanjut tanpa AI Tutor
              </Button>
            </Form>
          </div>
        ) : (
          <Form method="post">
            <input type="hidden" name="submissionId" value={submission.id} />
            <input type="hidden" name="stage" value={stage} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="content">{copy.prompt}</FieldLabel>
                <Textarea
                  id="content"
                  name="content"
                  required
                  minLength={10}
                  rows={stage === "4_revision_finalization" ? 14 : 9}
                  placeholder="Tulis jawabanmu di sini..."
                />
                <FieldDescription>Minimal 10 karakter. Jawaban disimpan saat tahap diselesaikan.</FieldDescription>
              </Field>
              <Button type="submit" className="w-fit" disabled={working}>
                {working && <Spinner data-icon="inline-start" />}
                {stage === "5_reflection" ? "Kumpulkan assignment" : "Selesaikan tahap"}
              </Button>
            </FieldGroup>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

function SubmissionResult({ assignment }: { assignment: AssignmentData }) {
  const submission = assignment.submission;
  if (!submission) return null;
  return (
    <div className="flex flex-col gap-5">
      <Alert>
        <Check />
        <AlertTitle>Assignment sudah dikumpulkan</AlertTitle>
        <AlertDescription>
          Jawaban tersimpan pada {formatDateTime(submission.submittedAt)}.
        </AlertDescription>
      </Alert>
      {submission.assessment && (
        <Card>
          <CardHeader>
            <CardTitle>Penilaian akademik</CardTitle>
            <CardDescription>Nilai ini terpisah dari laporan penggunaan AI.</CardDescription>
            <CardAction>
              <Badge variant="mint">{Number(submission.assessment.score)} / 100</Badge>
            </CardAction>
          </CardHeader>
          {submission.assessment.feedback && (
            <CardContent>
              <p className="whitespace-pre-wrap">{submission.assessment.feedback}</p>
            </CardContent>
          )}
        </Card>
      )}
      {submission.artifacts.map((artifact) => (
        <Card key={artifact.stage}>
          <CardHeader>
            <CardTitle>{stageCopy[artifact.stage].title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap leading-7">{artifact.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

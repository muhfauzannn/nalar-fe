import { ArrowLeft, Check, Copy, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "react-router";

import { MathText } from "~/components/math-text";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { ActionError, useAction } from "../components/action-feedback";
import { ConfirmAction } from "../components/confirm-action";
import { QuestionForm } from "../components/question-form";
import { ReorderControls } from "../components/reorder-controls";
import { StatusBadge } from "../components/status-badge";
import { isoToLocal } from "../lib/form";
import type { ManagedQuestion, QuizEditorData, WorkStatus } from "../types";

export function QuizEditorPage({ data }: { data: QuizEditorData }) {
  const { quiz, questions, attemptCount, locked, editable, readiness } = data;
  const [adding, setAdding] = useState(false);
  const closeAdd = useCallback(() => setAdding(false), []);
  const order = useAction();
  const ids = questions.map((question) => question.id);
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button variant="ghost" size="sm" render={<Link to={`/manage/courses/${quiz.courseId}?tab=quizzes`} />}>
          <ArrowLeft data-icon="inline-start" />
          Kembali ke course
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 max-w-3xl flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={quiz.status} />
            <Badge variant="outline">{questions.length} soal · {totalPoints} poin</Badge>
            <Badge variant="ghost">{attemptCount} pengerjaan</Badge>
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            {quiz.title}
          </h1>
        </div>
        <QuizStatusActions
          status={quiz.status}
          attemptCount={attemptCount}
          ready={readiness.ready}
          questionCount={readiness.questionCount}
        />
      </header>

      {locked ? (
        <Alert data-testid="quiz-locked">
          <Lock />
          <AlertTitle>Kuis ini sudah dikerjakan {attemptCount} siswa</AlertTitle>
          <AlertDescription>
            Soal, opsi, kunci jawaban, dan batas waktu dikunci agar semua siswa dinilai dengan kunci
            yang sama. Judul, instruksi, dan jadwal masih bisa diubah. Perlu versi baru? Salin kuis
            ini lalu ubah salinannya.
          </AlertDescription>
        </Alert>
      ) : quiz.status !== "draft" ? (
        <Alert>
          <AlertTitle>Kuis sudah diterbitkan</AlertTitle>
          <AlertDescription>
            Kembalikan ke draf untuk mengubah soal. Selama belum ada siswa yang mengerjakan, ini aman.
          </AlertDescription>
        </Alert>
      ) : null}

      <QuizSettingsCard data={data} />

      <section aria-labelledby="questions-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="questions-title" className="font-heading text-2xl font-semibold tracking-tight">
              Soal
            </h2>
            <p className="text-sm text-muted-foreground">
              Pilihan ganda dan isian singkat dinilai otomatis saat siswa mengumpulkan.
            </p>
          </div>
          {editable && !adding ? (
            <Button type="button" onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" />
              Tambah soal
            </Button>
          ) : null}
        </div>

        {adding ? (
          <Card>
            <CardContent>
              <QuestionForm quizId={quiz.id} onDone={closeAdd} />
            </CardContent>
          </Card>
        ) : null}

        <ActionError error={order.error} />
        {questions.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada soal. Kuis baru bisa diterbitkan setelah punya minimal satu soal.
          </p>
        ) : (
          <ol className="flex flex-col gap-3" aria-label="Daftar soal">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                quizId={quiz.id}
                number={index + 1}
                question={question}
                editable={editable}
                orderControls={
                  <ReorderControls
                    ids={ids}
                    index={index}
                    label={`soal ${index + 1}`}
                    disabled={!editable || order.pending}
                    onChange={(next) =>
                      order.submit({ intent: "question-order", quizId: quiz.id, ids: JSON.stringify(next) })
                    }
                  />
                }
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function QuizStatusActions({
  status,
  attemptCount,
  ready,
  questionCount,
}: {
  status: WorkStatus;
  attemptCount: number;
  ready: boolean;
  questionCount: number;
}) {
  const { pending, error, submit } = useAction();
  const change = (next: WorkStatus) => submit({ intent: "quiz-status", status: next });
  const copy = useAction();
  const canDraft = attemptCount === 0;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "draft" ? (
          <Button type="button" disabled={pending || !ready} onClick={() => change("published")}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Terbitkan kuis
          </Button>
        ) : null}
        {status === "published" ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => change("closed")}>
            Tutup kuis
          </Button>
        ) : null}
        {status === "closed" ? (
          <Button type="button" disabled={pending} onClick={() => change("published")}>
            Buka lagi
          </Button>
        ) : null}
        {(status === "published" || status === "closed") && canDraft ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => change("draft")}>
            Kembali ke draf
          </Button>
        ) : null}
        {status === "archived" ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => change(canDraft ? "draft" : "closed")}>
            Pulihkan
          </Button>
        ) : (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => change("archived")}>
            Arsipkan
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={copy.pending}
          onClick={() => copy.submit({ intent: "quiz-duplicate" })}
        >
          {copy.pending ? <Spinner data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          Salin kuis
        </Button>
      </div>
      {status === "draft" && !ready ? (
        <p className="text-xs text-muted-foreground">
          {questionCount === 0 ? "Tambahkan minimal satu soal untuk menerbitkan." : "Lengkapi soal yang bermasalah."}
        </p>
      ) : null}
      <ActionError error={error ?? copy.error} />
    </div>
  );
}

function QuizSettingsCard({ data }: { data: QuizEditorData }) {
  const { quiz, attemptCount } = data;
  const { fetcher, pending, error } = useAction();
  const limitLocked = attemptCount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan</CardTitle>
        <CardDescription>
          Waktu ditampilkan dalam zona waktu perangkatmu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <fetcher.Form
          method="post"
          key={`${quiz.title}|${quiz.instructions}|${quiz.timeLimitMinutes}|${quiz.availableAt}|${quiz.dueAt}|${quiz.closesAt}`}
          className="flex flex-col gap-5"
        >
          <input type="hidden" name="intent" value="quiz-update" />
          <ActionError error={error} />
          <Field>
            <FieldLabel htmlFor="quiz-title">Judul</FieldLabel>
            <Input id="quiz-title" name="title" required maxLength={160} defaultValue={quiz.title} />
          </Field>
          <Field>
            <FieldLabel htmlFor="quiz-instructions">Instruksi untuk siswa</FieldLabel>
            <Textarea
              id="quiz-instructions"
              name="instructions"
              rows={3}
              maxLength={5000}
              defaultValue={quiz.instructions ?? ""}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="quiz-limit">Batas waktu (menit)</FieldLabel>
              <Input
                id="quiz-limit"
                name="timeLimitMinutes"
                type="number"
                min={1}
                max={600}
                disabled={limitLocked}
                defaultValue={quiz.timeLimitMinutes ?? ""}
                placeholder="Tanpa batas"
              />
              {limitLocked ? <FieldDescription>Terkunci setelah ada yang mengerjakan.</FieldDescription> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="quiz-available">Mulai tersedia</FieldLabel>
              <Input id="quiz-available" name="availableAt" type="datetime-local" defaultValue={isoToLocal(quiz.availableAt)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="quiz-due">Batas pengumpulan</FieldLabel>
              <Input id="quiz-due" name="dueAt" type="datetime-local" defaultValue={isoToLocal(quiz.dueAt)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="quiz-closes">Ditutup otomatis</FieldLabel>
              <Input id="quiz-closes" name="closesAt" type="datetime-local" defaultValue={isoToLocal(quiz.closesAt)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Simpan pengaturan
            </Button>
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function QuestionCard({
  quizId,
  number,
  question,
  editable,
  orderControls,
}: {
  quizId: string;
  number: number;
  question: ManagedQuestion;
  editable: boolean;
  orderControls: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const closeEdit = useCallback(() => setEditing(false), []);
  const remove = useAction();

  return (
    <li>
      <Card data-testid="question-card">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start gap-3">
            {orderControls}
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
              {number}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-relaxed">
                <MathText>{question.prompt}</MathText>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {question.type === "multiple_choice" ? "Pilihan ganda" : "Isian singkat"}
                </Badge>
                <Badge variant="ghost">{question.points} poin</Badge>
              </div>
            </div>
            {editable ? (
              <div className="flex items-center gap-1">
                <Button type="button" size="xs" variant="ghost" onClick={() => setEditing((value) => !value)}>
                  <Pencil /> {editing ? "Tutup" : "Ubah"}
                </Button>
                <ConfirmAction
                  label="Hapus"
                  size="xs"
                  variant="ghost"
                  icon={<Trash2 />}
                  title={`Hapus soal ${number}?`}
                  description="Soal ini akan dihapus dari kuis dan tidak bisa dikembalikan."
                  confirmLabel="Hapus soal"
                  disabled={remove.pending}
                  onConfirm={() => remove.submit({ intent: "question-delete", questionId: question.id })}
                />
              </div>
            ) : null}
          </div>
          <ActionError error={remove.error} />

          {question.type === "multiple_choice" ? (
            <ul className="flex flex-col gap-1.5 pl-11" aria-label="Opsi jawaban">
              {question.options.map((option) => (
                <li
                  key={option.id}
                  data-correct={option.isCorrect}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${option.isCorrect ? "bg-brand-mint-soft font-medium text-brand-mint-foreground" : "text-muted-foreground"}`}
                >
                  {option.isCorrect ? <Check className="size-4 shrink-0" aria-label="Jawaban benar" /> : <span className="size-4 shrink-0" />}
                  <MathText>{option.label}</MathText>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pl-11 text-sm text-muted-foreground">
              Jawaban diterima:{" "}
              {(question.acceptedAnswers ?? []).map((answer, index) => (
                <span key={answer}>
                  {index > 0 ? ", " : ""}
                  <span className="rounded bg-brand-mint-soft px-1.5 py-0.5 font-medium text-brand-mint-foreground">
                    {answer}
                  </span>
                </span>
              ))}
            </p>
          )}
          {question.explanation ? (
            <p className="pl-11 text-xs text-muted-foreground">
              Pembahasan: <MathText>{question.explanation}</MathText>
            </p>
          ) : null}

          {editing ? (
            <div className="rounded-lg border bg-muted/30 p-4">
              <QuestionForm quizId={quizId} question={question} onDone={closeEdit} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}

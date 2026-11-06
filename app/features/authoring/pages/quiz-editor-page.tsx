import { ChartBar, Check, Copy, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { MathText } from "~/components/math-text";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { EmptyIllustration } from "~/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { ActionError, useAction } from "../components/action-feedback";
import { ConfirmAction } from "../components/confirm-action";
import { ListItem } from "../components/list-item";
import { QuestionForm } from "../components/question-form";
import { ReorderControls } from "../components/reorder-controls";
import { StatusBadge } from "../components/status-badge";
import { isoToLocal } from "../lib/form";
import { optimisticOrder, useFlip } from "../lib/motion";
import type { ManagedQuestion, QuizEditorData, WorkStatus } from "../types";

export function QuizEditorPage({ data }: { data: QuizEditorData }) {
  const { quiz, questions, attemptCount, locked, editable, readiness } = data;
  const [adding, setAdding] = useState(false);
  const closeAdd = useCallback(() => setAdding(false), []);
  const order = useAction();
  const shownQuestions = optimisticOrder(questions, order.formData);
  const ids = shownQuestions.map((question) => question.id);
  const flip = useFlip<HTMLOListElement>();
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        crumbs={[
          { label: "Kelola course", to: "/manage" },
          { label: "Isi course", to: `/manage/courses/${quiz.courseId}?tab=quizzes` },
        ]}
        eyebrow={
          <>
            <StatusBadge status={quiz.status} />
            <Badge variant="lavender">Kuis</Badge>
          </>
        }
        title={quiz.title}
        meta={
          <>
            <span className="tabular-nums">
              {questions.length} soal · {totalPoints} poin
            </span>
            <span className="tabular-nums">{attemptCount} pengerjaan</span>
          </>
        }
        actions={
          <QuizStatusActions
            quizId={quiz.id}
            status={quiz.status}
            attemptCount={attemptCount}
            ready={readiness.ready}
            questionCount={readiness.questionCount}
          />
        }
      />

      {locked ? (
        <Alert variant="note" data-testid="quiz-locked">
          <Lock />
          <AlertTitle>Kuis ini sudah dikerjakan {attemptCount} siswa</AlertTitle>
          <AlertDescription>
            Soal, opsi, kunci jawaban, dan batas waktu dikunci agar semua siswa dinilai dengan kunci
            yang sama. Judul, instruksi, dan jadwal masih bisa diubah. Perlu versi baru? Salin kuis
            ini lalu ubah salinannya.
          </AlertDescription>
        </Alert>
      ) : quiz.status !== "draft" ? (
        <Alert variant="note">
          <AlertTitle>Kuis sudah diterbitkan</AlertTitle>
          <AlertDescription>
            Kembalikan ke draf untuk mengubah soal. Selama belum ada siswa yang mengerjakan, ini aman.
          </AlertDescription>
        </Alert>
      ) : null}

      <QuizSettingsCard data={data} />

      <section aria-labelledby="questions-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="questions-title" className="font-heading text-2xl font-semibold tracking-tight">
              Soal
            </h2>
            <p className="text-sm text-muted-foreground">
              Pilihan ganda dan isian singkat dinilai otomatis saat siswa mengumpulkan.
            </p>
          </div>
          {editable && !adding && questions.length > 0 ? (
            <Button type="button" variant="mint" size="touch" className="max-sm:w-full" onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" strokeWidth={2.5} />
              Tambah soal
            </Button>
          ) : null}
        </div>

        {adding ? (
          <Card className="enter-up">
            <CardContent>
              <QuestionForm quizId={quiz.id} onDone={closeAdd} />
            </CardContent>
          </Card>
        ) : null}

        <ActionError error={order.error} />
        {questions.length === 0 ? (
          adding ? null : (
            <EmptyQuestions editable={editable} onAdd={() => setAdding(true)} />
          )
        ) : (
          <ol ref={flip.ref} className="flex flex-col gap-3" aria-label="Daftar soal">
            {shownQuestions.map((question, index) => (
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
                    size="tap"
                    label={`soal ${index + 1}`}
                    disabled={!editable}
                    onChange={(next) => {
                      flip.capture();
                      order.submit({ intent: "question-order", quizId: quiz.id, ids: JSON.stringify(next) });
                    }}
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

// A new quiz has no question; one needs to exist before it can be published.
function EmptyQuestions({ editable, onAdd }: { editable: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-6 text-center shadow-card ring-1 ring-border">
      <div className="grid size-32 place-items-center rounded-full bg-surface-soft">
        <EmptyIllustration alt="" width={1254} height={1254} className="mb-0 size-28 max-w-none" />
      </div>
      <h3 className="font-heading text-lg font-bold">Belum ada soal</h3>
      <p className="max-w-sm text-sm/relaxed text-muted-foreground">
        Kuis baru bisa diterbitkan setelah punya minimal satu soal.
      </p>
      {editable ? (
        <Button type="button" variant="mint" size="touch" className="max-sm:w-full" onClick={onAdd}>
          <Plus data-icon="inline-start" strokeWidth={2.5} />
          Tambah soal
        </Button>
      ) : null}
    </div>
  );
}

function QuizStatusActions({
  quizId,
  status,
  attemptCount,
  ready,
  questionCount,
}: {
  quizId: string;
  status: WorkStatus;
  attemptCount: number;
  ready: boolean;
  questionCount: number;
}) {
  const { pending, error, submit } = useAction();
  const change = (next: WorkStatus) => submit({ intent: "quiz-status", status: next });
  const copy = useAction();
  const canDraft = attemptCount === 0;
  const ringed = "border-2 border-brand-lavender";

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap gap-2 md:justify-end">
        {status !== "draft" ? (
          <Button variant="outline" size="touch" className={ringed} render={<Link to={`/manage/quizzes/${quizId}/analytics`} />}>
            <ChartBar data-icon="inline-start" />
            Refleksi tutor
          </Button>
        ) : null}
        {status === "draft" ? (
          <Button type="button" variant="mint" size="touch" loading={pending} disabled={!ready} onClick={() => change("published")}>
            Terbitkan kuis
          </Button>
        ) : null}
        {status === "published" ? (
          <Button type="button" variant="outline" size="touch" className={ringed} disabled={pending} onClick={() => change("closed")}>
            Tutup kuis
          </Button>
        ) : null}
        {status === "closed" ? (
          <Button type="button" variant="mint" size="touch" disabled={pending} onClick={() => change("published")}>
            Buka lagi
          </Button>
        ) : null}
        {(status === "published" || status === "closed") && canDraft ? (
          <Button type="button" variant="ghost" size="touch" disabled={pending} onClick={() => change("draft")}>
            Kembali ke draf
          </Button>
        ) : null}
        {status === "archived" ? (
          <Button
            type="button"
            variant="outline"
            size="touch"
            className={ringed}
            disabled={pending}
            onClick={() => change(canDraft ? "draft" : "closed")}
          >
            Pulihkan
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="touch" disabled={pending} onClick={() => change("archived")}>
            Arsipkan
          </Button>
        )}
        <Button
          type="button"
          variant="soft"
          size="touch"
          loading={copy.pending}
          onClick={() => copy.submit({ intent: "quiz-duplicate" })}
        >
          <Copy data-icon="inline-start" />
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
        <CardTitle className="text-[1.0625rem] font-bold">Pengaturan</CardTitle>
        <CardDescription>
          Waktu ditampilkan dalam zona waktu perangkatmu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <fetcher.Form
          method="post"
          key={`${quiz.title}|${quiz.instructions}|${quiz.timeLimitMinutes}|${quiz.aiAssistantEnabled}|${quiz.availableAt}|${quiz.dueAt}|${quiz.closesAt}`}
          className="flex flex-col gap-5"
        >
          <input type="hidden" name="intent" value="quiz-update" />
          <ActionError error={error} />
          <Field>
            <FieldLabel htmlFor="quiz-title" className="font-semibold">Judul</FieldLabel>
            <Input id="quiz-title" name="title" variant="soft" required maxLength={160} defaultValue={quiz.title} />
          </Field>
          <Field>
            <FieldLabel htmlFor="quiz-instructions" className="font-semibold">Instruksi untuk siswa</FieldLabel>
            <Textarea
              id="quiz-instructions"
              name="instructions"
              variant="soft"
              rows={3}
              maxLength={5000}
              defaultValue={quiz.instructions ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="quiz-ai-assistant" className="font-semibold">
              <Checkbox id="quiz-ai-assistant" name="aiAssistantEnabled" value="on" defaultChecked={quiz.aiAssistantEnabled !== false} />
              Izinkan AI Assistant
            </FieldLabel>
            <FieldDescription>Siswa dapat memanggil tutor AI saat mengerjakan kuis ini. Matikan untuk kuis tanpa bantuan AI.</FieldDescription>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="quiz-limit" className="font-semibold">Batas waktu (menit)</FieldLabel>
              <Input
                id="quiz-limit"
                name="timeLimitMinutes"
                variant="soft"
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
              <FieldLabel htmlFor="quiz-available" className="font-semibold">Mulai tersedia</FieldLabel>
              <Input id="quiz-available" name="availableAt" variant="soft" type="datetime-local" defaultValue={isoToLocal(quiz.availableAt)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="quiz-due" className="font-semibold">Batas pengumpulan</FieldLabel>
              <Input id="quiz-due" name="dueAt" variant="soft" type="datetime-local" defaultValue={isoToLocal(quiz.dueAt)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="quiz-closes" className="font-semibold">Ditutup otomatis</FieldLabel>
              <Input id="quiz-closes" name="closesAt" variant="soft" type="datetime-local" defaultValue={isoToLocal(quiz.closesAt)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="mint" size="xl" loading={pending} className="w-full sm:w-auto">
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
    <ListItem flipKey={question.id} index={number - 1}>
      <Card size="sm" data-testid="question-card">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-lavender-soft text-sm font-bold text-brand-lavender-foreground tabular-nums">
              {number}
            </span>
            <div className="min-w-0 flex-1">
              <p className="leading-relaxed font-semibold wrap-break-word">
                <MathText>{question.prompt}</MathText>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="lavender">
                  {question.type === "multiple_choice" ? "Pilihan ganda" : "Isian singkat"}
                </Badge>
                <Badge variant="outline">{question.points} poin</Badge>
              </div>
            </div>
          </div>

          {question.type === "multiple_choice" ? (
            <ul className="flex flex-col gap-2" aria-label="Opsi jawaban">
              {question.options.map((option) => (
                <li
                  key={option.id}
                  data-correct={option.isCorrect}
                  className={cn(
                    "flex items-center gap-3 rounded-[1.125rem] px-3 py-2.5 text-sm",
                    option.isCorrect
                      ? "bg-brand-mint-soft font-medium text-brand-mint-foreground"
                      : "bg-surface-soft text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full",
                      option.isCorrect
                        ? "bg-brand-mint text-brand-mint-ink"
                        : "border-2 border-brand-lavender bg-card",
                    )}
                  >
                    {option.isCorrect ? <Check className="size-3.5" strokeWidth={3} aria-label="Jawaban benar" /> : null}
                  </span>
                  <span className="min-w-0 wrap-break-word">
                    <MathText>{option.label}</MathText>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[1.125rem] bg-surface-soft px-3 py-2.5 text-sm text-muted-foreground">
              <p>Jawaban diterima:</p>
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                {(question.acceptedAnswers ?? []).map((answer) => (
                  <span
                    key={answer}
                    className="rounded-full bg-brand-mint-soft px-3 py-1 font-medium text-brand-mint-foreground"
                  >
                    {answer}
                  </span>
                ))}
              </p>
            </div>
          )}
          {question.explanation ? (
            <p className="rounded-[1.125rem] bg-brand-lavender-soft px-3 py-2.5 text-xs/relaxed text-brand-lavender-foreground">
              Pembahasan: <MathText>{question.explanation}</MathText>
            </p>
          ) : null}

          <ActionError error={remove.error} />

          {editable ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              {orderControls}
              <div className="flex items-center gap-1">
                <Button type="button" size="tap" variant="soft" onClick={() => setEditing((value) => !value)}>
                  <Pencil data-icon="inline-start" /> {editing ? "Tutup" : "Ubah"}
                </Button>
                <ConfirmAction
                  label="Hapus"
                  size="tap"
                  variant="ghost"
                  icon={<Trash2 data-icon="inline-start" />}
                  title={`Hapus soal ${number}?`}
                  description="Soal ini akan dihapus dari kuis dan tidak bisa dikembalikan."
                  confirmLabel="Hapus soal"
                  disabled={remove.pending}
                  onConfirm={() => remove.submit({ intent: "question-delete", questionId: question.id })}
                />
              </div>
            </div>
          ) : null}

          {editing ? (
            <div className="enter-up rounded-[1.125rem] border-2 border-brand-lavender-soft p-4">
              <QuestionForm quizId={quizId} question={question} onDone={closeEdit} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </ListItem>
  );
}

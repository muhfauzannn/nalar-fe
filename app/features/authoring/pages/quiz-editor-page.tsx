import { ChartBar, Check, Copy, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { MathText } from "~/components/math-text";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { EmptyIllustration } from "~/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { ActionError, useAction } from "../components/action-feedback";
import { ConfirmAction } from "../components/confirm-action";
import { EditorSection, SaveBar, useFormPart } from "../components/editor-kit";
import { ListItem } from "../components/list-item";
import { QuestionForm } from "../components/question-form";
import { ReorderControls } from "../components/reorder-controls";
import { StatusMenu, workChoices } from "../components/status-menu";
import { isoToLocal } from "../lib/form";
import { optimisticOrder, useFlip } from "../lib/motion";
import type { ManagedQuestion, QuizEditorData, WorkStatus } from "../types";

export function QuizEditorPage({ data }: { data: QuizEditorData }) {
  const { quiz, questions, attemptCount, locked, editable, readiness } = data;
  const [adding, setAdding] = useState(false);
  const closeAdd = useCallback(() => setAdding(false), []);
  const order = useAction();
  const status = useAction();
  const copy = useAction();
  const settings = useAction();
  const settingsForm = useRef<HTMLFormElement>(null);
  const version = `${quiz.title}|${quiz.instructions}|${quiz.timeLimitMinutes}|${quiz.aiAssistantEnabled}|${quiz.availableAt}|${quiz.dueAt}|${quiz.closesAt}`;
  const settingsPart = useFormPart(settingsForm, version);
  const shownQuestions = optimisticOrder(questions, order.formData);
  const ids = shownQuestions.map((question) => question.id);
  const flip = useFlip<HTMLOListElement>();
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
  const changeStatus = (next: WorkStatus) => status.submit({ intent: "quiz-status", status: next });

  return (
    <div className="flex flex-col gap-8 pb-24">
      <PageHeader
        crumbs={[
          { label: "Kelola course", to: "/manage" },
          { label: quiz.courseName, to: `/manage/courses/${quiz.courseId}?tab=quizzes` },
        ]}
        eyebrow={
          <>
            <StatusMenu
              status={quiz.status}
              noun="kuis"
              pending={status.pending}
              choices={workChoices(quiz.status, { ready: readiness.ready, canDraft: attemptCount === 0 })}
              onChange={changeStatus}
            />
            <Badge variant="outline">Kuis</Badge>
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
          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="flex flex-wrap gap-2 md:justify-end">
              {quiz.status === "draft" ? (
                <Button
                  type="button"
                  variant="mint"
                  size="touch"
                  loading={status.pending}
                  disabled={!readiness.ready}
                  onClick={() => changeStatus("published")}
                >
                  Terbitkan kuis
                </Button>
              ) : (
                <Button variant="outline" size="touch" render={<Link to={`/manage/quizzes/${quiz.id}/analytics`} />}>
                  <ChartBar data-icon="inline-start" />
                  Refleksi tutor
                </Button>
              )}
              <Button type="button" variant="ghost" size="touch" loading={copy.pending} onClick={() => copy.submit({ intent: "quiz-duplicate" })}>
                <Copy data-icon="inline-start" />
                Salin
              </Button>
            </div>
            {quiz.status === "draft" && !readiness.ready ? (
              <p className="text-xs text-muted-foreground">
                {readiness.questionCount === 0 ? "Tambahkan minimal satu soal untuk menerbitkan." : "Lengkapi soal yang bermasalah."}
              </p>
            ) : null}
            <ActionError error={status.error ?? copy.error} />
          </div>
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
            Kembalikan ke draf lewat status di atas untuk mengubah soal. Selama belum ada siswa yang mengerjakan, ini aman.
          </AlertDescription>
        </Alert>
      ) : null}

      <EditorSection
        id="questions-title"
        title="Soal"
        description="Pilihan ganda dan isian singkat dinilai otomatis saat siswa mengumpulkan."
        action={
          editable && !adding && questions.length > 0 ? (
            <Button type="button" variant="mint" size="touch" className="max-sm:w-full" onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" strokeWidth={2.5} />
              Tambah soal
            </Button>
          ) : null
        }
      >
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
      </EditorSection>

      <EditorSection id="settings-title" title="Pengaturan" description="Waktu ditampilkan dalam zona waktu perangkatmu.">
        <settings.fetcher.Form ref={settingsForm} method="post" key={version} className="flex flex-col gap-5">
          <input type="hidden" name="intent" value="quiz-update" />
          <ActionError error={settings.error} />
          <Field>
            <FieldLabel htmlFor="quiz-title" className="font-semibold">Judul</FieldLabel>
            <Input id="quiz-title" name="title" variant="soft" required maxLength={160} defaultValue={quiz.title} />
          </Field>
          <Field>
            <FieldLabel htmlFor="quiz-instructions" className="font-semibold">Instruksi untuk siswa</FieldLabel>
            <Textarea id="quiz-instructions" name="instructions" variant="soft" rows={3} maxLength={5000} defaultValue={quiz.instructions ?? ""} />
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
                disabled={attemptCount > 0}
                defaultValue={quiz.timeLimitMinutes ?? ""}
                placeholder="Tanpa batas"
              />
              {attemptCount > 0 ? <FieldDescription>Terkunci setelah ada yang mengerjakan.</FieldDescription> : null}
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
        </settings.fetcher.Form>
      </EditorSection>

      <SaveBar parts={[settingsPart]} pending={settings.pending} error={settings.error} />
    </div>
  );
}

// A new quiz has no question; one needs to exist before it can be published.
function EmptyQuestions({ editable, onAdd }: { editable: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center">
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

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowLeft,
  Brain,
  Check,
  Clock3,
  FileQuestion,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TimerOff,
  X,
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
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { QuizAttempt, QuizAttemptExpired } from "../components/quiz-attempt";
import { formatDateTime } from "../lib/format";
import type { AiRelianceLevel, QuizData, QuizUsageReflection } from "../types";

gsap.registerPlugin(useGSAP);

export function QuizPage({
  data: loaderData,
  actionError,
  actionCode,
}: {
  data: QuizData;
  actionError?: string;
  actionCode?: string;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const navigation = useNavigation();
  const working = navigation.state === "submitting";
  const submitted = loaderData.attempt?.status === "submitted";
  const expired =
    loaderData.attempt?.isExpired || actionCode === "QUIZ_ATTEMPT_EXPIRED";
  const activeAttempt = Boolean(
    loaderData.attempt &&
      !submitted &&
      !expired &&
      loaderData.attempt.canContinue,
  );
  const terminalActionError =
    actionCode === "QUIZ_ATTEMPT_EXPIRED" ||
    actionCode === "QUIZ_ATTEMPT_SUBMITTED" ||
    actionCode === "QUIZ_ALREADY_STARTED" ||
    actionCode === "QUIZ_ENROLLMENT_INACTIVE" ||
    actionCode === "QUIZ_NOT_AVAILABLE" ||
    actionCode === "QUIZ_NOT_READY";
  const multipleChoiceCount = loaderData.questions.filter(
    (question) => question.type === "multiple_choice",
  ).length;
  const shortAnswerCount = loaderData.questions.length - multipleChoiceCount;

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-quiz-reveal]", {
          y: 8,
          opacity: 0,
          duration: 0.24,
          ease: "power3.out",
          stagger: 0.04,
          clearProps: "transform,opacity",
        });
      });
      return () => media.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-8 lg:gap-10">
        <div data-quiz-reveal>
          <PageHeader
            crumbs={[
              { label: "Course saya", to: "/courses" },
              { label: loaderData.quiz.courseName, to: `/courses/${loaderData.quiz.courseId}` },
            ]}
            eyebrow={<Badge variant="lavender">Quiz</Badge>}
            title={loaderData.quiz.title}
            description={
              loaderData.quiz.instructions && (
                <span className="whitespace-pre-wrap">{loaderData.quiz.instructions}</span>
              )
            }
            meta={
              !activeAttempt && (
                <>
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <FileQuestion className="size-4" aria-hidden="true" />
                    {loaderData.questions.length} soal
                    {loaderData.questions.length > 0 &&
                      ` (${multipleChoiceCount} pilihan ganda, ${shortAnswerCount} isian singkat)`}
                  </span>
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Clock3 className="size-4" aria-hidden="true" />
                    {loaderData.quiz.timeLimitMinutes
                      ? `${loaderData.quiz.timeLimitMinutes} menit`
                      : "Tanpa batas waktu"}
                  </span>
                </>
              )
            }
          />
        </div>

        {actionError && !terminalActionError && (
          <Alert data-quiz-reveal variant="destructive">
            <AlertTitle>Quiz belum dapat diproses</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        <div data-quiz-reveal>
          {!loaderData.attempt ? (
            <QuizStartPanel data={loaderData} working={working} />
          ) : submitted ? (
            <QuizReview data={loaderData} />
          ) : expired ? (
            <QuizAttemptExpired data={loaderData} message={actionError} />
          ) : !loaderData.attempt.canContinue ? (
            <QuizAttemptLocked data={loaderData} message={actionError} />
          ) : (
            <QuizAttempt data={loaderData} working={working} />
          )}
        </div>
      </div>
    </div>
  );
}

function QuizStartPanel({ data, working }: { data: QuizData; working: boolean }) {
  // Only what changes how the student should start; counts and length are in the header.
  const rules = [
    "Hanya bisa dikerjakan sekali",
    data.quiz.timeLimitMinutes
      ? `Timer ${data.quiz.timeLimitMinutes} menit berjalan setelah kamu mulai`
      : null,
    "Jawaban tersimpan otomatis",
  ].filter((rule): rule is string => rule !== null);

  return (
    <Card className="max-w-xl">
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2.5 text-sm">
          {rules.map((rule) => (
            <li key={rule} className="flex items-center gap-2.5">
              <Check className="size-4 shrink-0 text-brand-mint-foreground" aria-hidden="true" />
              {rule}
            </li>
          ))}
        </ul>
        {data.quiz.dueAt ? (
          <p className="text-sm text-muted-foreground tabular-nums">
            Tenggat {formatDateTime(data.quiz.dueAt)}
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        {data.canStart ? (
          <Form method="post" className="w-full">
            <input type="hidden" name="intent" value="start" />
            <Button
              type="submit"
              className="w-full"
              disabled={working || data.questions.length === 0}
            >
              {working && <Spinner data-icon="inline-start" />}
              Mulai quiz
            </Button>
          </Form>
        ) : (
          <QuizStartUnavailable data={data} />
        )}
      </CardFooter>
    </Card>
  );
}

function QuizAttemptLocked({
  data,
  message,
}: {
  data: QuizData;
  message?: string;
}) {
  const readOnly = data.availability === "read_only";
  const notReady = data.availability === "not_ready";
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {readOnly
            ? "Quiz hanya dapat dilihat"
            : notReady
              ? "Quiz belum siap"
              : "Quiz sudah ditutup"}
        </CardTitle>
        <CardDescription>
          Attempt tidak dapat diubah atau dikumpulkan.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">Read-only</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Alert>
          <ShieldCheck />
          <AlertTitle>Progres dikunci</AlertTitle>
          <AlertDescription>
            {message ??
              `${data.attempt?.answers.length ?? 0} jawaban tersimpan. Hubungi pengajar jika status ini tidak sesuai.`}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button render={<Link to={`/courses/${data.quiz.courseId}`} />}>
          <ArrowLeft data-icon="inline-start" />
          Kembali ke course
        </Button>
      </CardFooter>
    </Card>
  );
}

function QuizStartUnavailable({ data }: { data: QuizData }) {
  if (data.availability === "upcoming") {
    return (
      <Alert>
        <Clock3 />
        <AlertTitle>Quiz belum tersedia</AlertTitle>
        <AlertDescription>
          Dapat dimulai pada {formatDateTime(data.quiz.availableAt)}.
        </AlertDescription>
      </Alert>
    );
  }
  if (data.availability === "closed") {
    return (
      <Alert variant="destructive">
        <TimerOff />
        <AlertTitle>Quiz sudah ditutup</AlertTitle>
        <AlertDescription>Attempt baru tidak dapat dimulai.</AlertDescription>
      </Alert>
    );
  }
  if (data.availability === "read_only") {
    return (
      <Alert>
        <AlertTitle>Course hanya dapat dilihat</AlertTitle>
        <AlertDescription>
          Enrollment tidak aktif sehingga quiz tidak dapat dimulai.
        </AlertDescription>
      </Alert>
    );
  }
  if (data.availability === "not_ready") {
    return (
      <Alert>
        <AlertTitle>Quiz belum siap</AlertTitle>
        <AlertDescription>
          Konfigurasi soal belum lengkap. Coba lagi setelah diperbarui pengajar.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <AlertTitle>Quiz belum siap</AlertTitle>
      <AlertDescription>Belum ada soal yang dapat dikerjakan.</AlertDescription>
    </Alert>
  );
}

const relianceCopy: Record<
  AiRelianceLevel,
  { title: string; badge: "mint" | "lavender" | "outline" | "destructive" }
> = {
  none: { title: "Tanpa AI Tutor", badge: "outline" },
  low: { title: "Pemakaian sehat", badge: "mint" },
  moderate: { title: "Campuran", badge: "lavender" },
  high: { title: "Cenderung meminta jawaban", badge: "destructive" },
};

function AiUsageReflection({
  reflection,
  attemptId,
}: {
  reflection: QuizUsageReflection | null;
  attemptId: string;
}) {
  const navigation = useNavigation();
  const analyzing =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "analyze";

  if (!reflection) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Refleksi penggunaan AI</CardTitle>
          <CardDescription>
            Cara kamu memakai AI Tutor saat quiz — bukan nilai dan tidak
            memengaruhi skor.
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
              Analisis belum selesai dibuat. Coba buat ulang refleksinya.
            </p>
            <Form method="post">
              <input type="hidden" name="intent" value="analyze" />
              <input type="hidden" name="attemptId" value={attemptId} />
              <Button type="submit" variant="outline" disabled={analyzing}>
                {analyzing ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCw data-icon="inline-start" />
                )}
                {analyzing ? "Menganalisis..." : "Buat refleksi"}
              </Button>
            </Form>
          </div>
        </CardContent>
      </Card>
    );
  }

  const copy = relianceCopy[reflection.relianceLevel];
  const stats =
    reflection.promptTurnCount > 0
      ? [
          { label: "Total tanya", value: reflection.promptTurnCount },
          { label: "Minta jawaban", value: reflection.directCount },
          { label: "Minta petunjuk", value: reflection.hintCount },
          { label: "Reflektif", value: reflection.reflectiveCount },
        ]
      : [];

  return (
    <Card className="overflow-hidden border-brand-lavender/60">
      <CardHeader className="border-b bg-brand-lavender-soft/40">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5" aria-hidden="true" />
          Refleksi penggunaan AI
        </CardTitle>
        <CardDescription>
          Cara kamu memakai AI Tutor saat quiz — bukan nilai dan tidak
          memengaruhi skor.
        </CardDescription>
        <CardAction>
          <Badge variant={copy.badge}>{copy.title}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground ring-1 ring-border/60">
            <Brain className="size-5" aria-hidden="true" />
          </span>
          <p className="whitespace-pre-wrap pt-1 text-sm/relaxed">
            {reflection.studentReport}
          </p>
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-muted/60 px-4 py-3">
                <p className="font-heading text-xl font-semibold tabular-nums">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {reflection.recommendations.length > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-mint/40 bg-brand-mint-soft/30 p-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="size-4" aria-hidden="true" />
              Rekomendasi
            </p>
            <ul className="flex flex-col gap-2">
              {reflection.recommendations.map((recommendation) => (
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

function QuizReview({ data }: { data: QuizData }) {
  const attempt = data.attempt;
  if (!attempt) return null;

  const firstIncorrectQuestion = data.questions.find((question) => {
    const answer = attempt.answers.find(
      (item) => item.questionId === question.id,
    );
    return !answer?.isCorrect;
  });

  return (
    <div className="flex flex-col gap-5">
      <Alert>
        <Check />
        <AlertTitle>Quiz sudah dikumpulkan</AlertTitle>
        <AlertDescription>
          Nilai akhir {Number(attempt.score ?? 0)} / 100 · dikumpulkan pada{" "}
          {formatDateTime(attempt.submittedAt)}.
        </AlertDescription>
      </Alert>

      <AiUsageReflection
        reflection={attempt.reflection ?? null}
        attemptId={attempt.id}
      />

      <Card>
        <CardHeader>
          <CardTitle>Tinjau jawaban</CardTitle>
          <CardDescription>
            Buka setiap soal untuk melihat jawaban dan pembahasan.
          </CardDescription>
          <CardAction>
            <Badge variant="mint">{Number(attempt.score ?? 0)} / 100</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Accordion
            multiple
            defaultValue={firstIncorrectQuestion ? [firstIncorrectQuestion.id] : []}
          >
            {data.questions.map((question, index) => {
              const answer = attempt.answers.find(
                (item) => item.questionId === question.id,
              );
              const selected = question.options.find(
                (option) => option.id === answer?.selectedOptionId,
              );
              const correct = question.options.find((option) => option.isCorrect);
              const studentAnswer =
                question.type === "short_answer"
                  ? answer?.textAnswer
                  : selected?.label;
              const correctAnswer =
                question.type === "short_answer"
                  ? question.correctAnswer
                  : correct?.label;

              return (
                <AccordionItem key={question.id} value={question.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex min-w-0 flex-1 items-start gap-3 pr-4">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary font-heading text-sm font-semibold tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-left text-sm/relaxed font-medium text-foreground">
                        <MathText>{question.prompt}</MathText>
                      </span>
                      <Badge variant={answer?.isCorrect ? "mint" : "destructive"}>
                        {answer?.isCorrect ? (
                          <Check data-icon="inline-start" />
                        ) : (
                          <X data-icon="inline-start" />
                        )}
                        {answer?.isCorrect ? "Benar" : "Belum tepat"}
                      </Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="flex flex-col gap-4 pl-11">
                    <Field>
                      <FieldLabel>Jawabanmu</FieldLabel>
                      <FieldDescription>
                        <MathText>{studentAnswer ?? "Tidak dijawab"}</MathText>
                      </FieldDescription>
                    </Field>
                    {!answer?.isCorrect && (
                      <Field>
                        <FieldLabel>Jawaban benar</FieldLabel>
                        <FieldDescription>
                          <MathText>{correctAnswer ?? "Tidak tersedia"}</MathText>
                        </FieldDescription>
                      </Field>
                    )}
                    {question.explanation && (
                      <Field>
                        <FieldLabel>Pembahasan</FieldLabel>
                        <FieldDescription>
                          <MathText>{question.explanation}</MathText>
                        </FieldDescription>
                      </Field>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            render={<Link to={`/courses/${data.quiz.courseId}`} />}
          >
            <ArrowLeft data-icon="inline-start" />
            Kembali ke course
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

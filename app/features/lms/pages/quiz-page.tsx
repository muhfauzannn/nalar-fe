import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowLeft,
  Check,
  Clock3,
  FileQuestion,
  ListChecks,
  ShieldCheck,
  TextCursorInput,
  TimerOff,
  X,
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
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Separator } from "~/components/ui/separator";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";
import { QuizAttempt, QuizAttemptExpired } from "../components/quiz-attempt";
import { formatDateTime } from "../lib/format";
import type { QuizData } from "../types";

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
          y: 14,
          opacity: 0,
          duration: 0.38,
          ease: "power2.out",
          stagger: 0.06,
          clearProps: "transform,opacity",
        });
        gsap.from("[data-quiz-art]", {
          scale: 0.88,
          opacity: 0,
          duration: 0.55,
          ease: "power3.out",
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
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<Link to={`/courses/${loaderData.quiz.courseId}`} />}
                >
                  {loaderData.quiz.courseName}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{loaderData.quiz.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div data-quiz-reveal>
          <header
            className={cn(
              activeAttempt
                ? "flex flex-col gap-3 border-b pb-6"
                : "group relative isolate grid min-h-80 overflow-hidden rounded-3xl bg-primary px-6 py-9 text-primary-foreground sm:px-9 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)] lg:items-center lg:px-12 lg:py-10",
            )}
          >
            {!activeAttempt && (
              <div
                aria-hidden="true"
                className="absolute -top-28 -left-24 size-72 rounded-full bg-secondary/10"
              />
            )}

            <div className="relative flex max-w-5xl flex-col items-start gap-4">
              <p
                className={cn(
                  "text-sm font-medium",
                  activeAttempt
                    ? "text-muted-foreground"
                    : "text-primary-foreground/60",
                )}
              >
                {loaderData.quiz.courseName} / Quiz
              </p>
              <h1
                className={cn(
                  "max-w-5xl font-heading leading-tight font-semibold tracking-tight text-balance",
                  activeAttempt
                    ? "text-3xl sm:text-4xl"
                    : "text-3xl sm:text-4xl lg:text-5xl",
                )}
              >
                {loaderData.quiz.title}
              </h1>
              {loaderData.quiz.instructions && (
                <p
                  className={cn(
                    "max-w-3xl whitespace-pre-wrap text-sm/relaxed sm:text-base/relaxed",
                    activeAttempt
                      ? "text-muted-foreground"
                      : "text-primary-foreground/70",
                  )}
                >
                  {loaderData.quiz.instructions}
                </p>
              )}
            </div>

            {!activeAttempt && (
              <div className="relative flex items-center justify-center lg:justify-end">
                <img
                  data-quiz-art
                  src="/illustration/chalkboard.svg"
                  width={1254}
                  height={1254}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none aspect-square w-full max-w-56 select-none object-contain transition-transform duration-700 ease-out group-hover:scale-105 sm:max-w-64 lg:max-w-72"
                />
              </div>
            )}
          </header>

          {!activeAttempt && (
            <QuizOverviewRail
              data={loaderData}
              multipleChoiceCount={multipleChoiceCount}
              shortAnswerCount={shortAnswerCount}
            />
          )}
        </div>

        {actionError && !terminalActionError && (
          <Alert data-quiz-reveal variant="destructive">
            <AlertTitle>Quiz belum dapat diproses</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        <div data-quiz-reveal>
          {!loaderData.attempt ? (
            <QuizStartPanel
              data={loaderData}
              working={working}
              multipleChoiceCount={multipleChoiceCount}
              shortAnswerCount={shortAnswerCount}
            />
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

function QuizOverviewRail({
  data,
  multipleChoiceCount,
  shortAnswerCount,
}: {
  data: QuizData;
  multipleChoiceCount: number;
  shortAnswerCount: number;
}) {
  const metrics = [
    {
      label: "Total soal",
      value: data.questions.length,
      icon: FileQuestion,
    },
    {
      label: "Pilihan ganda",
      value: multipleChoiceCount,
      icon: ListChecks,
    },
    {
      label: "Isian singkat",
      value: shortAnswerCount,
      icon: TextCursorInput,
    },
    {
      label: "Batas waktu",
      value: data.quiz.timeLimitMinutes
        ? `${data.quiz.timeLimitMinutes} mnt`
        : "Fleksibel",
      icon: Clock3,
    },
  ];

  return (
    <Card className="relative z-10 mx-4 -mt-7 sm:mx-8 lg:mx-12">
      <CardContent className="grid grid-flow-dense grid-cols-2 p-0 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }, index) => (
          <div
            key={label}
            className={cn(
              "flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5",
              index % 2 !== 0 && "border-l",
              index >= 2 && "border-t lg:border-t-0",
              index > 0 && "lg:border-l",
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-heading text-lg font-semibold tabular-nums sm:text-xl">
                {value}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {label}
              </span>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function QuizStartPanel({
  data,
  working,
  multipleChoiceCount,
  shortAnswerCount,
}: {
  data: QuizData;
  working: boolean;
  multipleChoiceCount: number;
  shortAnswerCount: number;
}) {
  const preparation = [
    "Jawaban tersimpan otomatis per soal.",
    "Quiz hanya dapat dikerjakan satu kali.",
    data.quiz.timeLimitMinutes
      ? `Timer ${data.quiz.timeLimitMinutes} menit dimulai setelah quiz dibuka.`
      : "Quiz tidak memiliki batas durasi khusus.",
  ];

  return (
    <section className="grid grid-flow-dense items-stretch gap-5 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardHeader>
          <CardTitle>Sebelum mulai</CardTitle>
          <CardDescription>
            Pastikan koneksi stabil dan selesaikan dalam satu attempt.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          {preparation.map((item, index) => (
            <div key={item}>
              {index > 0 && <Separator />}
              <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-mint-soft text-brand-mint-foreground">
                  <Check className="size-4" aria-hidden="true" />
                </span>
                <p className="pt-1 text-sm/relaxed">{item}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Siap mengerjakan?</CardTitle>
          <CardDescription>
            {multipleChoiceCount} pilihan ganda, {shortAnswerCount} isian singkat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-heading text-4xl font-semibold tabular-nums">
            {data.questions.length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">soal tersedia</p>
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
    </section>
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
                        {question.prompt}
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
                        {studentAnswer ?? "Tidak dijawab"}
                      </FieldDescription>
                    </Field>
                    {!answer?.isCorrect && (
                      <Field>
                        <FieldLabel>Jawaban benar</FieldLabel>
                        <FieldDescription>
                          {correctAnswer ?? "Tidak tersedia"}
                        </FieldDescription>
                      </Field>
                    )}
                    {question.explanation && (
                      <Field>
                        <FieldLabel>Pembahasan</FieldLabel>
                        <FieldDescription>{question.explanation}</FieldDescription>
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

import { Check, Clock3, TimerOff, X } from "lucide-react";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { QuizAttempt, QuizAttemptExpired } from "../components/quiz-attempt";
import type { QuizData } from "../types";
import { formatDateTime } from "../lib/format";

export function QuizPage({
  data: loaderData,
  actionError,
  actionCode,
}: {
  data: QuizData;
  actionError?: string;
  actionCode?: string;
}) {
  const navigation = useNavigation();
  const working = navigation.state === "submitting";
  const submitted = loaderData.attempt?.status === "submitted";
  const expired =
    loaderData.attempt?.isExpired || actionCode === "QUIZ_ATTEMPT_EXPIRED";
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

  return (
    <div className="flex flex-col gap-7">
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

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="mint">Quiz</Badge>
          <Badge variant="outline">
            <Clock3 data-icon="inline-start" />
            {formatDateTime(loaderData.quiz.dueAt)}
          </Badge>
          {loaderData.quiz.timeLimitMinutes && (
            <Badge variant="outline">
              {loaderData.quiz.timeLimitMinutes} menit
            </Badge>
          )}
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {loaderData.quiz.title}
        </h1>
        {loaderData.quiz.instructions && (
          <p className="max-w-3xl whitespace-pre-wrap text-muted-foreground">
            {loaderData.quiz.instructions}
          </p>
        )}
      </header>

      {actionError && !terminalActionError && (
        <Alert variant="destructive">
          <AlertTitle>Quiz belum dapat diproses</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {!loaderData.attempt ? (
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Siap mulai?</CardTitle>
            <CardDescription className="max-w-xl">
              Quiz terdiri dari {loaderData.questions.length} soal:{" "}
              {multipleChoiceCount} pilihan ganda dan {shortAnswerCount} isian
              singkat. Quiz hanya bisa dikerjakan satu kali.
            </CardDescription>
            <CardAction>
              <img
                src="/illustration/chalkboard.svg"
                width={1254}
                height={1254}
                alt=""
                aria-hidden="true"
                className="hidden size-28 object-contain sm:block md:size-36"
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            {loaderData.canStart ? (
              <Form method="post">
                <input type="hidden" name="intent" value="start" />
                <Button
                  type="submit"
                  disabled={working || loaderData.questions.length === 0}
                >
                  {working && <Spinner data-icon="inline-start" />}
                  Mulai quiz
                </Button>
              </Form>
            ) : (
              <QuizStartUnavailable data={loaderData} />
            )}
          </CardContent>
        </Card>
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
    <Card className="max-w-4xl">
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
          <AlertTitle>Progres dikunci</AlertTitle>
          <AlertDescription>
            {message ??
              `${data.attempt?.answers.length ?? 0} jawaban tersimpan. Hubungi pengajar jika status ini tidak sesuai.`}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button render={<Link to={`/courses/${data.quiz.courseId}`} />}>
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
  return (
    <div className="flex flex-col gap-5">
      <Alert>
        <Check />
        <AlertTitle>Quiz sudah dikumpulkan</AlertTitle>
        <AlertDescription>
          Nilai akhir: {Number(attempt.score ?? 0)} / 100. Dikumpulkan pada{" "}
          {formatDateTime(attempt.submittedAt)}.
        </AlertDescription>
      </Alert>
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
          <Card key={question.id}>
            <CardHeader>
              <CardTitle>
                {index + 1}. {question.prompt}
              </CardTitle>
              <CardDescription>
                {question.type === "multiple_choice"
                  ? "Pilihan ganda"
                  : "Isian singkat"}{" "}
                · {Number(question.points)} poin
              </CardDescription>
              <CardAction>
                <Badge variant={answer?.isCorrect ? "mint" : "destructive"}>
                  {answer?.isCorrect ? (
                    <Check data-icon="inline-start" />
                  ) : (
                    <X data-icon="inline-start" />
                  )}
                  {answer?.isCorrect ? "Benar" : "Belum tepat"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

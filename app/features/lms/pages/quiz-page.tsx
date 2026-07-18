import { Check, Clock3, X } from "lucide-react";
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
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { QuizAttempt } from "../components/quiz-attempt";
import type { QuizData } from "../types";
import { formatDateTime } from "../lib/format";

export function QuizPage({
  data: loaderData,
  actionError,
}: {
  data: QuizData;
  actionError?: string;
}) {
  const navigation = useNavigation();
  const working = navigation.state === "submitting";
  const submitted = loaderData.attempt?.status === "submitted";
  const multipleChoiceCount = loaderData.questions.filter(
    (question) => question.type === "multiple_choice",
  ).length;
  const shortAnswerCount = loaderData.questions.length - multipleChoiceCount;

  return (
    <div className="flex flex-col gap-7">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to={`/courses/${loaderData.quiz.courseId}`} />}>
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
            <Badge variant="outline">{loaderData.quiz.timeLimitMinutes} menit</Badge>
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

      {actionError && (
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
              Quiz terdiri dari {loaderData.questions.length} soal: {multipleChoiceCount} pilihan
              ganda dan {shortAnswerCount} isian singkat. Quiz hanya bisa dikerjakan satu kali.
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
              <Alert>
                <AlertTitle>Quiz belum dapat dimulai</AlertTitle>
                <AlertDescription>
                  Quiz belum tersedia, sudah ditutup, atau belum memiliki soal.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Badge variant="lavender">Satu soal per layar</Badge>
            <Badge variant="mint">Navigator progres</Badge>
          </CardFooter>
        </Card>
      ) : submitted ? (
        <QuizReview data={loaderData} />
      ) : (
        <QuizAttempt data={loaderData} working={working} />
      )}
    </div>
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
        const answer = attempt.answers.find((item) => item.questionId === question.id);
        const selected = question.options.find((option) => option.id === answer?.selectedOptionId);
        const correct = question.options.find((option) => option.isCorrect);
        const studentAnswer =
          question.type === "short_answer" ? answer?.textAnswer : selected?.label;
        const correctAnswer =
          question.type === "short_answer" ? question.correctAnswer : correct?.label;
        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle>
                {index + 1}. {question.prompt}
              </CardTitle>
              <CardDescription>
                {question.type === "multiple_choice" ? "Pilihan ganda" : "Isian singkat"} ·{" "}
                {Number(question.points)} poin
              </CardDescription>
              <CardAction>
                <Badge variant={answer?.isCorrect ? "mint" : "destructive"}>
                  {answer?.isCorrect ? <Check data-icon="inline-start" /> : <X data-icon="inline-start" />}
                  {answer?.isCorrect ? "Benar" : "Belum tepat"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Field>
                <FieldLabel>Jawabanmu</FieldLabel>
                <FieldDescription>{studentAnswer ?? "Tidak dijawab"}</FieldDescription>
              </Field>
              {!answer?.isCorrect && (
                <Field>
                  <FieldLabel>Jawaban benar</FieldLabel>
                  <FieldDescription>{correctAnswer ?? "Tidak tersedia"}</FieldDescription>
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

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CloudCheck,
  ClipboardCheck,
} from "lucide-react";
import { Form, useFetcher } from "react-router";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Spinner } from "~/components/ui/spinner";
import type { QuizData } from "../types";

type QuizQuestion = QuizData["questions"][number];
type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
type SaveAnswerActionData = {
  saved?: boolean;
  deleted?: boolean;
  savedAt?: string;
  questionId?: string | null;
  error?: string;
};

function savedAnswerValue(data: QuizData, question: QuizQuestion) {
  const savedAnswer = data.attempt?.answers.find(
    (answer) => answer.questionId === question.id,
  );
  return question.type === "multiple_choice"
    ? (savedAnswer?.selectedOptionId ?? "")
    : (savedAnswer?.textAnswer ?? "");
}

function normalizedAnswerValue(question: QuizQuestion, value: string) {
  return question.type === "short_answer" ? value.trim() : value;
}

function initialAnswerMap(data: QuizData) {
  return Object.fromEntries(
    data.questions.map((question) => [question.id, savedAnswerValue(data, question)]),
  );
}

function hasAnswer(answers: Record<string, string>, questionId: string) {
  return Boolean(answers[questionId]?.trim());
}

export function QuizAttempt({ data, working }: { data: QuizData; working: boolean }) {
  const attempt = data.attempt;
  const [answers, setAnswers] = useState<Record<string, string>>(() => initialAnswerMap(data));
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>(() =>
    Object.fromEntries(
      data.questions.map((question) => [
        question.id,
        savedAnswerValue(data, question) ? "saved" : "idle",
      ]),
    ),
  );
  const [retryToken, setRetryToken] = useState(0);
  const [activeStep, setActiveStep] = useState(() => {
    const savedAnswers = initialAnswerMap(data);
    const firstUnanswered = data.questions.findIndex(
      (question) => !hasAnswer(savedAnswers, question.id),
    );
    return firstUnanswered === -1 ? data.questions.length : firstUnanswered;
  });

  if (!attempt) return null;

  const questionCount = data.questions.length;
  const reviewStep = questionCount;
  const reviewing = activeStep === reviewStep;
  const activeQuestion = reviewing ? undefined : data.questions[activeStep];
  const answeredCount = data.questions.filter((question) =>
    hasAnswer(answers, question.id),
  ).length;
  const unansweredQuestions = data.questions.filter(
    (question) => !hasAnswer(answers, question.id),
  );
  const hasSaveError = Object.values(saveStatuses).includes("error");

  const updateSaveStatus = useCallback((questionId: string, status: SaveStatus) => {
    setSaveStatuses((current) =>
      current[questionId] === status
        ? current
        : { ...current, [questionId]: status },
    );
  }, []);

  function updateAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    updateSaveStatus(questionId, "pending");
  }

  function goToQuestion(index: number) {
    setActiveStep(Math.min(Math.max(index, 0), Math.max(questionCount - 1, 0)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!reviewing || unansweredQuestions.length > 0) {
      event.preventDefault();
      setActiveStep(reviewStep);
    }
  }

  return (
    <Form method="post" onSubmit={handleSubmit}>
      <input type="hidden" name="attemptId" value={attempt.id} />
      {data.questions.map((question) => (
        <Fragment key={question.id}>
          <input type="hidden" name="questionId" value={question.id} />
          <input
            type="hidden"
            name={`questionType:${question.id}`}
            value={question.type}
          />
          <input
            type="hidden"
            name={`answer:${question.id}`}
            value={answers[question.id] ?? ""}
          />
        </Fragment>
      ))}

      {data.questions.map((question) => (
        <QuizAnswerAutosave
          key={`autosave-${question.id}`}
          attemptId={attempt.id}
          question={question}
          answer={answers[question.id] ?? ""}
          initialValue={savedAnswerValue(data, question)}
          retryToken={retryToken}
          onStatusChange={updateSaveStatus}
        />
      ))}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <main id="quiz-workspace" className="min-w-0">
          {hasSaveError && (
            <Alert variant="destructive" className="mb-5">
              <CircleAlert />
              <AlertTitle>Ada jawaban yang belum tersimpan</AlertTitle>
              <AlertDescription>
                Periksa koneksi lalu coba simpan kembali.
              </AlertDescription>
              <AlertAction>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRetryToken((value) => value + 1)}
                >
                  Coba lagi
                </Button>
              </AlertAction>
            </Alert>
          )}
          {reviewing ? (
            <QuizAnswerReview
              questions={data.questions}
              answers={answers}
              unansweredQuestions={unansweredQuestions}
              working={working}
              onSelectQuestion={goToQuestion}
            />
          ) : activeQuestion ? (
            <QuestionWorkspace
              key={activeQuestion.id}
              question={activeQuestion}
              questionIndex={activeStep}
              questionCount={questionCount}
              answer={answers[activeQuestion.id] ?? ""}
              saveStatus={saveStatuses[activeQuestion.id] ?? "idle"}
              onAnswerChange={(value) => updateAnswer(activeQuestion.id, value)}
              onPrevious={() => goToQuestion(activeStep - 1)}
              onNext={() =>
                setActiveStep(activeStep === questionCount - 1 ? reviewStep : activeStep + 1)
              }
            />
          ) : (
            <Alert>
              <CircleAlert />
              <AlertTitle>Soal belum tersedia</AlertTitle>
              <AlertDescription>Quiz ini belum memiliki soal yang dapat dikerjakan.</AlertDescription>
            </Alert>
          )}
        </main>

        <QuizNavigator
          questions={data.questions}
          answers={answers}
          activeStep={activeStep}
          answeredCount={answeredCount}
          saveStatuses={saveStatuses}
          onSelectQuestion={goToQuestion}
          onReview={() => setActiveStep(reviewStep)}
        />
      </div>
    </Form>
  );
}

function QuizAnswerAutosave({
  attemptId,
  question,
  answer,
  initialValue,
  retryToken,
  onStatusChange,
}: {
  attemptId: string;
  question: QuizQuestion;
  answer: string;
  initialValue: string;
  retryToken: number;
  onStatusChange: (questionId: string, status: SaveStatus) => void;
}) {
  const fetcher = useFetcher<SaveAnswerActionData>();
  const lastSavedValue = useRef(normalizedAnswerValue(question, initialValue));
  const inFlightValue = useRef<string | null>(null);
  const observedRequest = useRef(false);
  const failedValue = useRef<string | null>(null);
  const normalizedAnswer = normalizedAnswerValue(question, answer);

  useEffect(() => {
    failedValue.current = null;
  }, [retryToken]);

  useEffect(() => {
    if (fetcher.state !== "idle") {
      if (inFlightValue.current !== null) observedRequest.current = true;
      return;
    }
    if (inFlightValue.current === null || !observedRequest.current) return;

    const submittedValue = inFlightValue.current;
    inFlightValue.current = null;
    observedRequest.current = false;

    if (fetcher.data?.error) {
      failedValue.current = submittedValue;
      onStatusChange(question.id, "error");
      return;
    }
    if (fetcher.data?.saved || fetcher.data?.deleted) {
      lastSavedValue.current = submittedValue;
      failedValue.current = null;
      onStatusChange(question.id, "saved");
    }
  }, [fetcher.data, fetcher.state, onStatusChange, question.id]);

  useEffect(() => {
    if (
      fetcher.state !== "idle" ||
      inFlightValue.current !== null ||
      normalizedAnswer === lastSavedValue.current ||
      normalizedAnswer === failedValue.current
    ) {
      if (normalizedAnswer === lastSavedValue.current) {
        onStatusChange(
          question.id,
          normalizedAnswer || initialValue ? "saved" : "idle",
        );
      }
      return;
    }

    const timeout = window.setTimeout(
      () => {
        inFlightValue.current = normalizedAnswer;
        onStatusChange(question.id, "saving");
        fetcher.submit(
          {
            intent: normalizedAnswer ? "save-answer" : "delete-answer",
            attemptId,
            questionId: question.id,
            questionType: question.type,
            answer: normalizedAnswer,
          },
          { method: "post" },
        );
      },
      question.type === "short_answer" ? 650 : 0,
    );

    return () => window.clearTimeout(timeout);
  }, [
    answer,
    attemptId,
    fetcher,
    fetcher.state,
    initialValue,
    normalizedAnswer,
    onStatusChange,
    question.id,
    question.type,
    retryToken,
  ]);

  return null;
}

function QuestionWorkspace({
  question,
  questionIndex,
  questionCount,
  answer,
  saveStatus,
  onAnswerChange,
  onPrevious,
  onNext,
}: {
  question: QuizQuestion;
  questionIndex: number;
  questionCount: number;
  answer: string;
  saveStatus: SaveStatus;
  onAnswerChange: (value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const lastQuestion = questionIndex === questionCount - 1;

  return (
    <Card className="min-h-[30rem]">
      <CardHeader>
        <CardTitle className="max-w-3xl text-balance">
          {question.prompt}
        </CardTitle>
        <CardDescription>
          Soal {questionIndex + 1} dari {questionCount} · {Number(question.points)} poin
        </CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <QuizSaveStatus status={saveStatus} />
          <Badge variant={question.type === "multiple_choice" ? "lavender" : "mint"}>
            {question.type === "multiple_choice" ? "Pilihan ganda" : "Isian singkat"}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex-1">
        {question.type === "multiple_choice" ? (
          <FieldSet>
            <FieldLegend className="sr-only">Pilih satu jawaban</FieldLegend>
            <RadioGroup
              value={answer}
              onValueChange={(value) => onAnswerChange(String(value))}
              aria-label={`Jawaban soal ${questionIndex + 1}`}
            >
              {question.options.map((option) => (
                <FieldLabel key={option.id} htmlFor={option.id}>
                  <Field orientation="horizontal">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <FieldContent>
                      <FieldTitle>{option.label}</FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>
        ) : (
          <Field>
            <FieldLabel htmlFor={`answer-${question.id}`}>Jawaban singkat</FieldLabel>
            <Input
              id={`answer-${question.id}`}
              value={answer}
              onChange={(event) => onAnswerChange(event.target.value)}
              placeholder="Ketik istilah atau jawaban singkat"
              autoComplete="off"
              maxLength={500}
              aria-describedby={`answer-help-${question.id}`}
            />
            <FieldDescription id={`answer-help-${question.id}`}>
              Kapitalisasi dan spasi berlebih tidak memengaruhi penilaian.
            </FieldDescription>
          </Field>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={questionIndex === 0}
          onClick={onPrevious}
        >
          <ArrowLeft data-icon="inline-start" />
          Sebelumnya
        </Button>
        <Button type="button" onClick={onNext}>
          {lastQuestion ? "Tinjau jawaban" : "Berikutnya"}
          {lastQuestion ? (
            <ClipboardCheck data-icon="inline-end" />
          ) : (
            <ArrowRight data-icon="inline-end" />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function QuizSaveStatus({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  if (status === "saving" || status === "pending") {
    return (
      <Badge variant="outline">
        <Spinner data-icon="inline-start" />
        {status === "pending" ? "Menunggu simpan" : "Menyimpan"}
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="destructive">
        <CircleAlert data-icon="inline-start" />
        Gagal disimpan
      </Badge>
    );
  }
  return (
    <Badge variant="mint">
      <CloudCheck data-icon="inline-start" />
      Tersimpan
    </Badge>
  );
}

function QuizNavigator({
  questions,
  answers,
  activeStep,
  answeredCount,
  saveStatuses,
  onSelectQuestion,
  onReview,
}: {
  questions: QuizQuestion[];
  answers: Record<string, string>;
  activeStep: number;
  answeredCount: number;
  saveStatuses: Record<string, SaveStatus>;
  onSelectQuestion: (index: number) => void;
  onReview: () => void;
}) {
  const progress = questions.length === 0 ? 0 : (answeredCount / questions.length) * 100;
  const reviewing = activeStep === questions.length;
  const statusValues = Object.values(saveStatuses);
  const progressSaveStatus: SaveStatus = statusValues.includes("error")
    ? "error"
    : statusValues.some((status) => status === "saving" || status === "pending")
      ? "saving"
      : answeredCount > 0
        ? "saved"
        : "idle";

  return (
    <aside className="order-first xl:order-last xl:sticky xl:top-24">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Navigasi quiz</CardTitle>
          <CardDescription>Pilih nomor soal untuk berpindah.</CardDescription>
          <CardAction>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="mint">
                {answeredCount}/{questions.length} terjawab
              </Badge>
              <QuizSaveStatus status={progressSaveStatus} />
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Progress value={progress}>
            <ProgressLabel>Progres jawaban</ProgressLabel>
            <ProgressValue />
          </Progress>

          <nav
            aria-label="Navigasi soal"
            className="grid grid-cols-5 gap-2 sm:grid-cols-8 xl:grid-cols-5"
          >
            {questions.map((question, index) => {
              const answered = hasAnswer(answers, question.id);
              const active = activeStep === index;
              return (
                <Button
                  key={question.id}
                  type="button"
                  size="icon"
                  variant={active ? "default" : answered ? "secondary" : "outline"}
                  aria-label={`Buka soal ${index + 1}${
                    answered ? ", sudah dijawab" : ", belum dijawab"
                  }`}
                  aria-current={active ? "step" : undefined}
                  onClick={() => onSelectQuestion(index)}
                >
                  {index + 1}
                </Button>
              );
            })}
          </nav>

          <div className="flex flex-wrap gap-2" aria-label="Keterangan navigator">
            <Badge>Aktif</Badge>
            <Badge variant="lavender">Terjawab</Badge>
            <Badge variant="outline">Belum dijawab</Badge>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant={reviewing ? "default" : "outline"}
            className="w-full"
            onClick={onReview}
          >
            <ClipboardCheck data-icon="inline-start" />
            Tinjau jawaban
          </Button>
        </CardFooter>
      </Card>
    </aside>
  );
}

function QuizAnswerReview({
  questions,
  answers,
  unansweredQuestions,
  working,
  onSelectQuestion,
}: {
  questions: QuizQuestion[];
  answers: Record<string, string>;
  unansweredQuestions: QuizQuestion[];
  working: boolean;
  onSelectQuestion: (index: number) => void;
}) {
  const complete = unansweredQuestions.length === 0;

  return (
    <Card className="min-h-[30rem]">
      <CardHeader>
        <CardTitle>Periksa sebelum dikumpulkan</CardTitle>
        <CardDescription>
          Jawaban tidak dapat diubah lagi setelah quiz dikumpulkan.
        </CardDescription>
        <CardAction>
          <Badge variant={complete ? "mint" : "lavender"}>
            {questions.length - unansweredQuestions.length}/{questions.length} terjawab
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        <Alert variant={complete ? "default" : "destructive"}>
          {complete ? <Check /> : <CircleAlert />}
          <AlertTitle>{complete ? "Semua soal sudah dijawab" : "Masih ada jawaban kosong"}</AlertTitle>
          <AlertDescription>
            {complete
              ? "Kamu dapat kembali memeriksa soal atau langsung mengumpulkan quiz."
              : `${unansweredQuestions.length} soal belum dijawab. Buka soal tersebut sebelum mengumpulkan quiz.`}
          </AlertDescription>
        </Alert>

        <div className="grid gap-2 sm:grid-cols-2">
          {questions.map((question, index) => {
            const answered = hasAnswer(answers, question.id);
            return (
              <Button
                key={question.id}
                type="button"
                variant="outline"
                className="h-auto justify-between py-3"
                onClick={() => onSelectQuestion(index)}
              >
                <span>Soal {index + 1}</span>
                <Badge variant={answered ? "mint" : "outline"}>
                  {answered ? "Terjawab" : "Belum dijawab"}
                </Badge>
              </Button>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => onSelectQuestion(0)}>
          <ArrowLeft data-icon="inline-start" />
          Kembali ke soal
        </Button>
        <Button type="submit" disabled={!complete || working}>
          {working ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <ClipboardCheck data-icon="inline-start" />
          )}
          Kumpulkan quiz
        </Button>
      </CardFooter>
    </Card>
  );
}

import {
  CalendarClock,
  CalendarX2,
  Eye,
  Hourglass,
  LockKeyhole,
  TimerOff,
} from "lucide-react";

import type { QuizData } from "../types";
import {
  AccessNotice,
  contactTeacher,
  datedFact as dated,
  noticeFacts as facts,
  type Notice,
  type NoticeFact,
} from "./access-notice";

function savedAnswers(data: QuizData, count: number): NoticeFact {
  return {
    label: "Jawaban tersimpan",
    value: `${count} dari ${data.questions.length} soal`,
  };
}

/** No attempt yet, and the quiz cannot be started. */
export function QuizUnavailable({ data }: { data: QuizData }) {
  const { availableAt, dueAt, closesAt } = data.quiz;
  let notice: Notice;

  switch (data.availability) {
    case "upcoming":
      notice = {
        tone: "upcoming",
        icon: CalendarClock,
        title: "Quiz belum dibuka",
        description: "Kamu bisa mulai mengerjakan begitu quiz dibuka.",
        facts: facts(dated("Dibuka", availableAt), dated("Tenggat", dueAt)),
      };
      break;
    case "closed":
      notice = {
        tone: "neutral",
        icon: CalendarX2,
        title: "Quiz sudah ditutup",
        description: closesAt
          ? "Batas pengerjaan sudah lewat, jadi quiz ini tidak bisa dimulai lagi."
          : "Quiz ini tidak lagi menerima pengerjaan baru.",
        facts: facts(dated("Ditutup", closesAt ?? dueAt)),
        hint: contactTeacher,
      };
      break;
    case "read_only":
      notice = {
        tone: "neutral",
        icon: Eye,
        title: "Course hanya dapat dilihat",
        description:
          "Enrollment atau course sedang tidak aktif, jadi quiz ini tidak bisa dimulai.",
        hint: contactTeacher,
      };
      break;
    case "not_ready":
      notice = {
        tone: "neutral",
        icon: Hourglass,
        title: "Quiz belum siap",
        description:
          "Pengajar masih menyiapkan soal. Coba lagi setelah quiz diperbarui.",
        facts: facts(dated("Tenggat", dueAt)),
      };
      break;
    default:
      notice = {
        tone: "neutral",
        icon: Hourglass,
        title: "Quiz belum siap",
        description: "Quiz ini belum memiliki soal yang dapat dikerjakan.",
      };
  }

  return <AccessNotice notice={notice} courseId={data.quiz.courseId} />;
}

/** An attempt exists but can no longer be continued (and its time has not run out). */
export function QuizAttemptLocked({
  data,
  message,
}: {
  data: QuizData;
  message?: string;
}) {
  const title =
    data.availability === "read_only"
      ? "Quiz hanya dapat dilihat"
      : data.availability === "not_ready"
        ? "Quiz belum siap"
        : "Quiz sudah ditutup";

  return (
    <AccessNotice
      courseId={data.quiz.courseId}
      notice={{
        tone: "neutral",
        icon: LockKeyhole,
        title,
        description:
          message ?? "Pengerjaanmu dikunci, jadi jawaban tidak bisa diubah atau dikumpulkan.",
        facts: facts(savedAnswers(data, data.attempt?.answers.length ?? 0)),
        hint: "Hubungi pengajar jika status ini tidak sesuai.",
      }}
    />
  );
}

/** The time limit passed, either while the student was away or while the page was open. */
export function QuizAttemptExpired({
  data,
  message,
  savedAnswerCount,
}: {
  data: QuizData;
  message?: string;
  savedAnswerCount?: number;
}) {
  return (
    <AccessNotice
      courseId={data.quiz.courseId}
      notice={{
        tone: "danger",
        icon: TimerOff,
        title: "Waktu pengerjaan berakhir",
        description:
          message ??
          "Attempt ditutup otomatis saat batas waktu tercapai, jadi tidak bisa dikumpulkan lagi.",
        facts: facts(
          savedAnswers(data, savedAnswerCount ?? data.attempt?.answers.length ?? 0),
          dated("Batas waktu", data.attempt?.expiresAt ?? null),
        ),
      }}
    />
  );
}

/** The server refused a save mid-attempt; the page is already re-reading the quiz. */
export function QuizAttemptBlocked({
  data,
  message,
}: {
  data: QuizData;
  message: string;
}) {
  return (
    <AccessNotice
      syncing="Memperbarui status quiz…"
      courseId={data.quiz.courseId}
      notice={{
        tone: "neutral",
        icon: LockKeyhole,
        title: "Attempt tidak lagi aktif",
        description: message,
      }}
    />
  );
}

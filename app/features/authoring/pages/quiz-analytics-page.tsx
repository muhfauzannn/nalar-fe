import { Brain } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "~/components/layout/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Chip, ChipCount } from "~/components/ui/chip";
import { cn } from "~/lib/utils";
import { StatTile } from "../components/stat-tile";
import { StatusBadge } from "../components/status-badge";
import { RELIANCE_LEVELS, relianceCopy } from "../lib/offloading";
import type { AiRelianceLevel, QuizAnalytics, QuizReflection } from "../types";

type Student = QuizAnalytics["students"][number];
type Filter = "all" | AiRelianceLevel | "pending";

const statusText = { not_started: "Belum mengerjakan", in_progress: "Sedang mengerjakan", submitted: "Refleksi belum tersedia" } as const;

// How each student used the tutor while taking one quiz (PRD §5.3A). A mirror for
// the conversation about it, not a grade: it carries no score, the list is by name
// and not by rank, and nothing here feeds Poin Nalar.
export function QuizAnalyticsPage({ data }: { data: QuizAnalytics }) {
  const { quiz, counts, distribution, students } = data;
  const [filter, setFilter] = useState<Filter>("all");

  const pending = students.filter((student) => !student.reflection).length;
  const shown = students.filter((student) =>
    filter === "all" ? true : filter === "pending" ? !student.reflection : student.reflection?.relianceLevel === filter,
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        crumbs={[
          { label: "Kelola course", to: "/manage" },
          { label: quiz.courseName, to: `/manage/courses/${quiz.courseId}?tab=quizzes` },
          { label: quiz.title, to: `/manage/quizzes/${quiz.id}` },
        ]}
        eyebrow={
          <>
            <StatusBadge status={quiz.status} />
            <Badge variant="lavender">Refleksi tutor</Badge>
          </>
        }
        title={quiz.title}
        description="Cara siswa memakai AI Tutor saat mengerjakan kuis ini. Ini bahan percakapan, bukan nilai, dan tidak memengaruhi skor kuis."
      />

      <section aria-label="Ringkasan pengerjaan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Siswa" value={counts.enrolled} />
        <StatTile label="Belum mengerjakan" value={counts.notStarted} />
        <StatTile label="Sedang mengerjakan" value={counts.inProgress} />
        <StatTile label="Sudah mengumpulkan" value={counts.submitted} note={`${counts.reflected} punya refleksi`} />
      </section>

      <Distribution distribution={distribution} reflected={counts.reflected} onPick={setFilter} />

      <Card>
        <CardHeader>
          <CardTitle>Siswa</CardTitle>
          <CardDescription>Diurutkan menurut nama, bukan peringkat. Buka satu siswa untuk membaca refleksinya.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            role="group"
            aria-label="Saring menurut pemakaian tutor"
            className="-mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            <Chip pressed={filter === "all"} onClick={() => setFilter("all")}>
              Semua <ChipCount>{students.length}</ChipCount>
            </Chip>
            {RELIANCE_LEVELS.map((level) => (
              <Chip key={level} pressed={filter === level} onClick={() => setFilter(level)}>
                {relianceCopy[level].name} <ChipCount>{distribution.find((row) => row.level === level)?.count ?? 0}</ChipCount>
              </Chip>
            ))}
            <Chip pressed={filter === "pending"} onClick={() => setFilter("pending")}>
              Belum ada refleksi <ChipCount>{pending}</ChipCount>
            </Chip>
          </div>

          {filter !== "all" && filter !== "pending" ? (
            <p className="rounded-[1.125rem] bg-surface-soft p-4 text-sm/relaxed" data-testid="follow-up">
              <span className="font-semibold">Tindak lanjut: </span>
              {relianceCopy[filter].followUp}
            </p>
          ) : null}

          {students.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada siswa di course ini.</p>
          ) : shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada siswa di kelompok ini.</p>
          ) : (
            <ul aria-label="Daftar siswa" className="flex flex-col">
              {shown.map((student) => (
                <li key={student.membershipId} data-testid="quiz-student" className="border-b last:border-b-0">
                  <StudentRow student={student} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Distribution({
  distribution,
  reflected,
  onPick,
}: {
  distribution: QuizAnalytics["distribution"];
  reflected: number;
  onPick: (level: AiRelianceLevel) => void;
}) {
  const most = Math.max(1, ...distribution.map((row) => row.count));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sebaran pemakaian tutor</CardTitle>
        <CardDescription>
          {reflected === 0
            ? "Belum ada refleksi. Refleksi dibuat setelah siswa mengumpulkan kuis."
            : `Dari ${reflected} pengerjaan yang sudah punya refleksi. Pilih satu untuk menyaring daftar.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1">
          {distribution.map((row) => {
            const copy = relianceCopy[row.level];
            const share = reflected ? Math.round((row.count / reflected) * 100) : 0;
            return (
              <li key={row.level}>
                <button
                  type="button"
                  onClick={() => onPick(row.level)}
                  title={`${copy.name}: ${copy.pattern}`}
                  className="flex min-h-11 w-full flex-col justify-center gap-1.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{copy.name}</span>
                    <span className="tabular-nums">
                      <span className="font-semibold">{row.count}</span>
                      <span className="text-muted-foreground"> · {share}%</span>
                    </span>
                  </span>
                  <span className="h-2.5 rounded-full bg-muted">
                    <span
                      className={cn("block h-full rounded-full", copy.swatch)}
                      style={{ width: `${row.count ? Math.max(4, (row.count / most) * 100) : 0}%` }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function LevelChip({ level }: { level: AiRelianceLevel }) {
  return (
    <Badge variant="outline" className="gap-1.5">
      <span aria-hidden="true" className={cn("size-2 rounded-full", relianceCopy[level].swatch)} />
      {relianceCopy[level].name}
    </Badge>
  );
}

function StudentRow({ student }: { student: Student }) {
  const { reflection } = student;
  if (!reflection) {
    return (
      <div className="flex min-h-14 items-center justify-between gap-3 py-2">
        <span className="text-base font-medium wrap-break-word">{student.name}</span>
        <span className="text-right text-sm text-muted-foreground">{statusText[student.status]}</span>
      </div>
    );
  }

  const asked = reflection.promptTurnCount;
  return (
    <Accordion>
      <AccordionItem value={student.membershipId}>
        <AccordionTrigger className="min-h-14 items-center gap-3 py-2 hover:no-underline">
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-base font-medium wrap-break-word">{student.name}</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-normal">
              <LevelChip level={reflection.relianceLevel} />
              <span className="text-xs text-muted-foreground tabular-nums">
                {asked === 0 ? "Tidak bertanya ke tutor" : `${asked} pertanyaan · ${reflection.directCount} minta jawaban`}
              </span>
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <ReflectionDetail reflection={reflection} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function ReflectionDetail({ reflection }: { reflection: QuizReflection }) {
  const stats = [
    { label: "Total tanya", value: reflection.promptTurnCount },
    { label: "Minta jawaban", value: reflection.directCount },
    { label: "Minta petunjuk", value: reflection.hintCount },
    { label: "Reflektif", value: reflection.reflectiveCount },
  ];
  return (
    <div className="flex flex-col gap-4 pb-3">
      {reflection.promptTurnCount > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-muted/60 px-4 py-3">
              <p className="font-heading text-xl font-semibold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : null}
      {reflection.redirectedCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          Tutor mengalihkan {reflection.redirectedCount} permintaan jawaban jadi ke petunjuk.
        </p>
      ) : null}
      <figure className="flex items-start gap-3 rounded-[1.125rem] bg-surface-soft p-4">
        <Brain className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1">
          <figcaption className="text-xs font-semibold text-muted-foreground">Laporan yang dibaca siswa</figcaption>
          <p className="whitespace-pre-wrap text-sm/relaxed">{reflection.studentReport}</p>
        </div>
      </figure>
      {reflection.recommendations.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-foreground">Saran untuk siswa</p>
          <ul className="list-disc pl-5 text-sm/relaxed">
            {reflection.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

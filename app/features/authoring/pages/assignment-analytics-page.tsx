import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { ClassJourney } from "../components/class-journey";
import { StatTile } from "../components/stat-tile";
import { humanizeFactor, LEVELS, levelCopy, stageCopy } from "../lib/offloading";
import type { AssignmentAnalytics, OffloadingLevel } from "../types";

type Student = AssignmentAnalytics["students"][number];
type Filter = "all" | OffloadingLevel | "pending";

export function AssignmentAnalyticsPage({ data }: { data: AssignmentAnalytics }) {
  const { assignment, counts, distribution, commonFactors, students } = data;
  const [filter, setFilter] = useState<Filter>("all");
  const base = `/manage/assignments/${assignment.id}`;

  const shown = students.filter((student) =>
    filter === "all"
      ? true
      : filter === "pending"
        ? !student.offloading
        : student.offloading?.level === filter,
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        crumbs={[
          { label: "Kelola course", to: "/manage" },
          { label: assignment.courseName, to: `/manage/courses/${assignment.courseId}?tab=assignments` },
          { label: assignment.title, to: base },
        ]}
        eyebrow={<Badge variant="lavender">Analitik kelas</Badge>}
        title={assignment.title}
        description="Proses berpikir siswa di tugas ini: siapa di tahap mana, dan bagaimana mereka memakai AI. AI Offloading Index adalah bahan refleksi, bukan nilai."
      />

      <section aria-label="Ringkasan pengerjaan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Siswa" value={counts.enrolled} />
        <StatTile label="Belum mulai" value={counts.notStarted} />
        <StatTile label="Sedang mengerjakan" value={counts.inProgress} />
        <StatTile label="Sudah mengumpulkan" value={counts.submitted} note={`${counts.analyzed} sudah dianalisis`} />
      </section>

      {data.journeyRules && <ClassJourney data={data} base={base} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Distribution distribution={distribution} analyzed={counts.analyzed} onPick={setFilter} />
        <CommonFactors factors={commonFactors} analyzed={counts.analyzed} />
      </div>

      <FollowUps students={students} base={base} />

      <Card>
        <CardHeader>
          <CardTitle>Siswa</CardTitle>
          <CardDescription>Buka satu siswa untuk melihat linimasa prosesnya dari draf awal sampai refleksi.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div role="group" aria-label="Saring menurut level" className="flex flex-wrap gap-2">
            {(["all", ...LEVELS, "pending"] as Filter[]).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={filter === value ? "default" : "outline"}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === "all" ? "Semua" : value === "pending" ? "Belum dianalisis" : levelCopy[value].name}
              </Button>
            ))}
          </div>
          <StudentTable students={shown} base={base} />
        </CardContent>
      </Card>
    </div>
  );
}

function Distribution({
  distribution,
  analyzed,
  onPick,
}: {
  distribution: AssignmentAnalytics["distribution"];
  analyzed: number;
  onPick: (level: OffloadingLevel) => void;
}) {
  const most = Math.max(1, ...distribution.map((row) => row.count));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sebaran level</CardTitle>
        <CardDescription>
          {analyzed === 0 ? "Belum ada pengerjaan yang dianalisis." : `Dari ${analyzed} pengerjaan yang sudah dianalisis.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1">
          {distribution.map((row) => {
            const copy = levelCopy[row.level];
            const share = analyzed ? Math.round((row.count / analyzed) * 100) : 0;
            return (
              <li key={row.level}>
                <button
                  type="button"
                  onClick={() => onPick(row.level)}
                  title={`${copy.name} (skor ${copy.range}): ${row.count} siswa, ${share}%`}
                  className="grid w-full grid-cols-[8.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="text-sm">
                    <span className="block font-medium">{copy.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">skor {copy.range}</span>
                  </span>
                  <span className="h-3 rounded-full bg-muted">
                    <span
                      className={cn("block h-full rounded-full", copy.swatch)}
                      style={{ width: `${row.count ? Math.max(4, (row.count / most) * 100) : 0}%` }}
                    />
                  </span>
                  <span className="text-right text-sm tabular-nums">
                    <span className="font-semibold">{row.count}</span>
                    <span className="text-muted-foreground"> · {share}%</span>
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

function CommonFactors({ factors, analyzed }: { factors: AssignmentAnalytics["commonFactors"]; analyzed: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Faktor yang paling sering mendorong ketergantungan</CardTitle>
        <CardDescription>Dihitung dari penjelasan Index tiap siswa.</CardDescription>
      </CardHeader>
      <CardContent>
        {factors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada faktor yang menonjol.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {factors.map((factor) => (
              <li key={factor.factor} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{humanizeFactor(factor.factor)}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {factor.students} dari {analyzed} siswa
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{factor.example}</p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// Grouped by level, most reliant first: who needs what next.
function FollowUps({ students, base }: { students: Student[]; base: string }) {
  const groups = [...LEVELS]
    .reverse()
    .map((level) => ({ level, members: students.filter((student) => student.offloading?.level === level) }))
    .filter((group) => group.members.length > 0);
  if (groups.length === 0) return null;
  return (
    <section aria-labelledby="follow-up-title" className="flex flex-col gap-3">
      <h2 id="follow-up-title" className="font-heading text-lg font-semibold">
        Tindak lanjut per kelompok
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map(({ level, members }) => (
          <Card key={level} size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span aria-hidden="true" className={cn("size-3 rounded-full", levelCopy[level].swatch)} />
                {levelCopy[level].name} · {members.length} siswa
              </CardTitle>
              <CardDescription>{levelCopy[level].followUp}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {members.map((student) => (
                <Button key={student.membershipId} size="sm" variant="outline" render={<Link to={`${base}/analytics/${student.submissionId}`} />}>
                  {student.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function StudentTable({ students, base }: { students: Student[]; base: string }) {
  if (students.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada siswa di kelompok ini.</p>;
  }
  // Inline-size containment keeps the table's width from widening the page; it
  // scrolls inside the card on narrow screens instead.
  return (
    <div className="[contain:inline-size]">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama</TableHead>
          <TableHead>Tahap</TableHead>
          <TableHead>Level</TableHead>
          <TableHead className="text-right">Skor</TableHead>
          <TableHead className="hidden md:table-cell">Faktor utama</TableHead>
          <TableHead>
            <span className="sr-only">Aksi</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => (
          <TableRow key={student.membershipId}>
            <TableCell className="font-medium">{student.name}</TableCell>
            <TableCell>
              <StageDots student={student} />
            </TableCell>
            <TableCell>
              {student.offloading ? (
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className={cn("size-2.5 rounded-full", levelCopy[student.offloading.level].swatch)} />
                  {levelCopy[student.offloading.level].name}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {student.status === "not_started" ? "Belum mulai" : student.status === "in_progress" ? "Mengerjakan" : "Belum dianalisis"}
                </span>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {student.offloading ? <Score score={student.offloading.score} previous={student.offloading.previousScore} /> : "–"}
            </TableCell>
            <TableCell className="hidden max-w-72 truncate text-muted-foreground md:table-cell">
              {student.offloading?.topFactor ? humanizeFactor(student.offloading.topFactor.factor) : "–"}
            </TableCell>
            <TableCell className="text-right">
              {student.submissionId ? (
                <Button size="sm" variant="ghost" render={<Link to={`${base}/analytics/${student.submissionId}`} />}>
                  Lihat proses
                  <ArrowRight data-icon="inline-end" />
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}

function StageDots({ student }: { student: Student }) {
  const done = student.status === "submitted" || student.status === "returned" ? 5 : student.stagesCompleted;
  const label = student.status === "not_started" ? "Belum mulai" : `${done} dari 5 tahap selesai`;
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={label} title={student.currentStage && done < 5 ? `Sekarang: ${stageCopy[student.currentStage].name}` : label}>
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          key={index}
          className={cn(
            "size-2 rounded-full",
            index < done ? "bg-brand-mint" : index === done && student.status === "in_progress" ? "bg-brand-mint/40 ring-1 ring-brand-mint" : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

// Higher means more reliant, so a drop is the good direction.
function Score({ score, previous }: { score: number; previous: number | null }) {
  const delta = previous === null ? null : Math.round(score - previous);
  const Icon = delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center justify-end gap-1">
      <span className="font-semibold">{Math.round(score)}</span>
      {delta !== null ? (
        <span
          className="inline-flex items-center text-xs text-muted-foreground"
          title={`Tugas sebelumnya: ${Math.round(previous!)}`}
          aria-label={delta === 0 ? "sama dengan tugas sebelumnya" : `${delta > 0 ? "naik" : "turun"} ${Math.abs(delta)} dari tugas sebelumnya`}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {delta === 0 ? "" : Math.abs(delta)}
        </span>
      ) : null}
    </span>
  );
}

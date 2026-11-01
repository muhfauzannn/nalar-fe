import { CornerDownRight } from "lucide-react";

import { PageHeader } from "~/components/layout/page-header";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { humanizeFactor, intentCopy, levelCopy, stageCopy } from "../lib/offloading";
import type { PromptIntent, SubmissionProcess } from "../types";

const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const when = (value: string | null) => (value ? dateTime.format(new Date(value)) : null);

export function SubmissionProcessPage({ data }: { data: SubmissionProcess }) {
  const { assignment, student, submission, stages, tutor, offloading, trend } = data;
  const analyticsPath = `/manage/assignments/${assignment.id}/analytics`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        crumbs={[
          { label: "Kelola course", to: "/manage" },
          { label: assignment.courseName, to: `/manage/courses/${assignment.courseId}?tab=assignments` },
          { label: "Analitik kelas", to: analyticsPath },
        ]}
        eyebrow={<Badge variant="lavender">Proses siswa</Badge>}
        title={student.name}
        description={assignment.title}
        meta={
          <>
            {submission.attemptNumber > 1 ? <span>Percobaan ke-{submission.attemptNumber}</span> : null}
            {submission.submittedAt ? <span>Dikumpulkan {when(submission.submittedAt)}</span> : <span>Belum dikumpulkan</span>}
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="timeline-title" className="flex flex-col gap-3">
          <h2 id="timeline-title" className="font-heading text-lg font-semibold">
            Linimasa proses
          </h2>
          <ol className="flex flex-col">
            {stages.map((stage, index) => (
              <li key={stage.stage} className="relative flex gap-4 pb-6 last:pb-0">
                {index < stages.length - 1 ? (
                  <span aria-hidden="true" className="absolute top-9 bottom-0 left-[17px] w-px bg-border" />
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    "z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    stage.status === "completed"
                      ? "bg-brand-mint text-brand-mint-foreground"
                      : stage.status === "in_progress"
                        ? "bg-brand-mint-soft text-brand-mint-foreground ring-2 ring-brand-mint"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {stageCopy[stage.stage].short}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="font-medium">{stageCopy[stage.stage].name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {stage.status === "locked"
                        ? "Belum dibuka"
                        : stage.completedAt
                          ? `Selesai ${when(stage.completedAt)}`
                          : "Sedang dikerjakan"}
                    </span>
                  </div>
                  {stage.stage === "2_guided_questioning" ? (
                    <TutorTurns tutor={tutor} />
                  ) : stage.content ? (
                    <>
                      <Artifact content={stage.content} versions={stage.versions} />
                      {WRITTEN.includes(stage.stage) && stage.status === "completed" ? (
                        <Writing writing={stage.writing} />
                      ) : null}
                    </>
                  ) : stage.status !== "locked" ? (
                    <p className="text-sm text-muted-foreground">Belum ada tulisan.</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <IndexCard offloading={offloading} trend={trend} />
        </aside>
      </div>
    </div>
  );
}

function Artifact({ content, versions }: { content: string; versions: number }) {
  const long = content.length > 420;
  const body = <p className="text-sm/relaxed whitespace-pre-wrap">{content}</p>;
  return (
    <div className="rounded-2xl bg-muted/60 p-4">
      {long ? (
        <details>
          <summary className="cursor-pointer text-sm/relaxed whitespace-pre-wrap marker:text-muted-foreground">
            {content.slice(0, 280).trimEnd()}… <span className="font-medium text-foreground underline underline-offset-4">tampilkan semua</span>
          </summary>
          <div className="mt-3">{body}</div>
        </details>
      ) : (
        body
      )}
      {versions > 1 ? <p className="mt-2 text-xs text-muted-foreground">Disimpan {versions} kali</p> : null}
    </div>
  );
}

// Stages whose text is the student's own, and so carry a writing signal.
const WRITTEN = ["1_independent_effort", "4_revision_finalization"];

const minutes = (seconds: number) =>
  seconds < 60 ? `${seconds} detik` : `${Math.round(seconds / 60)} menit`;

// How the text came about (sinyal 1). Facts only; the Index weighs them.
function Writing({ writing }: { writing: SubmissionProcess["stages"][number]["writing"] }) {
  if (!writing) {
    return (
      <p className="text-xs text-muted-foreground">
        Belum ada catatan cara menulis untuk tahap ini (dikerjakan sebelum perekaman aktif).
      </p>
    );
  }
  const pasted = Math.round(writing.pastedShare * 100);
  const facts = [
    { label: "Menulis aktif", value: minutes(writing.activeSeconds) },
    {
      label: "Teks yang ditempel",
      value: writing.pasteCount ? `${pasted}% · ${writing.pasteCount}×` : "Tidak ada",
      note: writing.pasteCount ? `Tempelan terbesar ${writing.largestPaste} karakter` : undefined,
      strong: pasted >= 50,
    },
    { label: "Diketik / dihapus", value: `${writing.typedChars} / ${writing.deletedChars} karakter` },
    { label: "Jeda panjang", value: `${writing.longPauses}×`, note: "Diam 30 detik atau lebih" },
    { label: "Pindah tab", value: `${writing.focusLosses}×` },
  ];
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-x-4 gap-y-2 rounded-2xl border border-dashed p-3 text-xs" aria-label="Cara menulis">
      {facts.map((fact) => (
        <div key={fact.label} title={fact.note}>
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className={cn("tabular-nums", fact.strong ? "font-semibold" : "font-medium")}>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const INTENTS: PromptIntent[] = ["reflective_evaluative", "explanation_hint", "direct_answer"];

function TutorTurns({ tutor }: { tutor: SubmissionProcess["tutor"] }) {
  if (tutor.promptCount === 0) {
    return <p className="text-sm text-muted-foreground">Tidak bertanya ke NALAR di tugas ini.</p>;
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-4">
      <p className="text-sm">
        <span className="font-medium tabular-nums">{tutor.promptCount} pertanyaan</span>
        {tutor.redirected ? <span className="text-muted-foreground"> · {tutor.redirected} dialihkan menjadi pertanyaan penuntun</span> : null}
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="Niat pertanyaan">
        {INTENTS.map((intent) => (
          <li key={intent}>
            <Badge variant={intent === "direct_answer" ? "outline" : intent === "reflective_evaluative" ? "mint" : "lavender"}>
              {intentCopy[intent]} · {tutor.intents[intent]}
            </Badge>
          </li>
        ))}
      </ul>
      <details>
        <summary className="cursor-pointer text-sm font-medium underline-offset-4 hover:underline">Lihat percakapan</summary>
        <ol className="mt-3 flex flex-col gap-2">
          {tutor.messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                "flex max-w-[90%] flex-col gap-1 rounded-2xl px-3 py-2 text-sm/relaxed",
                message.author === "student" ? "self-end bg-primary text-primary-foreground" : "self-start bg-card ring-1 ring-border",
              )}
            >
              <span className="whitespace-pre-wrap">{message.content}</span>
              {message.author === "student" && message.intent ? (
                <span className="inline-flex items-center gap-1 text-xs opacity-80">
                  {message.wasRedirected ? <CornerDownRight className="size-3" aria-hidden="true" /> : null}
                  {intentCopy[message.intent]}
                  {message.wasRedirected ? " · dialihkan" : ""}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function IndexCard({ offloading, trend }: { offloading: SubmissionProcess["offloading"]; trend: SubmissionProcess["trend"] }) {
  if (!offloading) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>AI Offloading Index</CardTitle>
          <CardDescription>Belum tersedia. Index dihitung setelah siswa menyelesaikan Tahap 5.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const copy = levelCopy[offloading.level];
  const widest = Math.max(1, ...offloading.factors.map((factor) => Math.abs(factor.contribution)));
  return (
    <Card>
      <CardHeader>
        <CardDescription>AI Offloading Index</CardDescription>
        <CardTitle className="flex items-baseline gap-3">
          <span className="text-4xl font-semibold tabular-nums">{Math.round(offloading.score)}</span>
          <span className="inline-flex items-center gap-2 text-base font-medium">
            <span aria-hidden="true" className={cn("size-3 rounded-full", copy.swatch)} />
            {copy.name}
          </span>
        </CardTitle>
        <CardDescription>{copy.pattern}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {trend.length > 1 ? <Trend trend={trend} /> : null}

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Kenapa skornya begini</h3>
          <ul className="flex flex-col gap-3">
            {offloading.factors.map((factor) => {
              const pushes = factor.contribution > 0;
              return (
                <li key={factor.factor} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>{humanizeFactor(factor.factor)}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {pushes ? "+" : "−"}
                      {Math.abs(Math.round(factor.contribution))} {pushes ? "menaikkan" : "menurunkan"}
                    </span>
                  </div>
                  <span className="h-1.5 rounded-full bg-muted">
                    <span
                      className={cn("block h-full rounded-full", pushes ? "bg-level-3" : "bg-brand-mint")}
                      style={{ width: `${(Math.abs(factor.contribution) / widest) * 100}%` }}
                    />
                  </span>
                  <p className="text-xs/relaxed text-muted-foreground">{factor.plainExplanation}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-4">
          <h3 className="text-sm font-medium">Tindak lanjut untuk guru</h3>
          <p className="text-sm/relaxed text-muted-foreground">{copy.followUp}</p>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer font-medium underline-offset-4 hover:underline">Laporan yang dilihat siswa</summary>
          <div className="mt-2 flex flex-col gap-2 text-muted-foreground">
            <p className="text-sm/relaxed">{offloading.studentReport}</p>
            {offloading.recommendations.length ? (
              <ul className="list-disc pl-5 text-sm/relaxed">
                {offloading.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

// Index per assignment in this course, oldest first. Higher = more reliant.
function Trend({ trend }: { trend: SubmissionProcess["trend"] }) {
  const width = 280;
  const height = 84;
  const pad = { x: 10, top: 10, bottom: 18 };
  const x = (index: number) => pad.x + (index * (width - pad.x * 2)) / Math.max(1, trend.length - 1);
  const y = (score: number) => pad.top + ((100 - score) / 100) * (height - pad.top - pad.bottom);
  const line = trend.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(point.score).toFixed(1)}`).join("");
  const first = trend[0]!;
  const last = trend.at(-1)!;
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="text-sm font-medium">Perkembangan di course ini</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Skor dari ${Math.round(first.score)} di ${first.assignmentTitle} ke ${Math.round(last.score)} di ${last.assignmentTitle}`}>
        {[25, 50, 75].map((band) => (
          <line key={band} x1={pad.x} x2={width - pad.x} y1={y(band)} y2={y(band)} className="stroke-border" strokeWidth="1" strokeDasharray="2 4" />
        ))}
        <path d={line} fill="none" className="stroke-level-3" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {trend.map((point, index) => (
          <g key={point.submissionId}>
            <circle cx={x(index)} cy={y(point.score)} r={12} fill="transparent">
              <title>{`${point.assignmentTitle}: ${Math.round(point.score)} (${levelCopy[point.level].name})`}</title>
            </circle>
            <circle
              cx={x(index)}
              cy={y(point.score)}
              r={point.current ? 5 : 4}
              className={cn("stroke-card", point.current ? "fill-primary" : "fill-level-3")}
              strokeWidth="2"
              pointerEvents="none"
            />
          </g>
        ))}
        <text x={x(0)} y={height - 4} className="fill-muted-foreground text-[10px]" textAnchor="start">
          {Math.round(first.score)}
        </text>
        <text x={x(trend.length - 1)} y={height - 4} className="fill-foreground text-[10px] font-semibold" textAnchor="end">
          {Math.round(last.score)}
        </text>
      </svg>
      <p className="text-xs text-muted-foreground">Makin rendah, makin mandiri. Titik besar adalah tugas ini.</p>
    </figure>
  );
}

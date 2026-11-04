import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { evidenceOf, flowOf, isConcern, needsTalk, routesOf, STEPS, travellers, type Traveller } from "../lib/class-journey";
import type { AssignmentAnalytics } from "../types";

type Pick = { title: string; students: Traveller[] };

// Above this many words, or this share changed, a student is simply far along: the map stops there.
const MAP_MAX_WORDS = 100;
const MAP_MAX_CHANGE = 75;

// How the class went through the task, from what students did and not from the Index. Picking a
// flow or a student shows who is there and the evidence, because that is what a teacher acts on.
export function ClassJourney({ data, base }: { data: AssignmentAnalytics; base: string }) {
  const rules = data.journeyRules;
  const students = travellers(data.students);
  const attention: Pick = { title: "Perlu didekati", students: students.filter((student) => needsTalk(student.journey, rules)) };
  const [picked, setPicked] = useState<Pick | null>(null);
  const shown = picked ?? attention;
  if (students.length === 0) return null;

  return (
    <section aria-label="Perjalanan kelas" className="flex flex-col gap-6">
      <ClassFlow students={students} onPick={setPicked} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ClassMap students={students} rules={rules} shown={shown} onPick={setPicked} />
        <PickedStudents pick={shown} base={base} onClear={picked ? () => setPicked(null) : undefined} />
      </div>
    </section>
  );
}

const WIDTH = 720;
const HEIGHT = 250;
const GAP = 14;
const COLUMN_X = [150, 355, 560];
const BAR = 10;

function ClassFlow({ students, onPick }: { students: Traveller[]; onPick: (pick: Pick) => void }) {
  const { columns, links } = flowOf(students);
  const routes = routesOf(students);
  const tallest = Math.max(...columns.map((column) => column.length));
  const unit = (HEIGHT - GAP * (tallest - 1)) / students.length;
  const top = new Map<string, number>();
  columns.forEach((column) => {
    let y = 0;
    for (const node of column) {
      top.set(node.value, y);
      y += node.students.length * unit + GAP;
    }
  });
  // Where the next ribbon leaves or enters each node, so ribbons stack instead of crossing inside it.
  const out = new Map(top);
  const into = new Map(top);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alur kelas</CardTitle>
        <CardDescription>Dari draf awal sampai revisi. Tebal alur adalah jumlah siswa; pilih alur untuk melihat siapa saja.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT + 24}`} className="mx-auto hidden w-full max-w-3xl sm:block" role="img" aria-label="Alur siswa dari draf awal, cara bertanya, sampai revisi. Rinciannya ada di daftar di bawah.">
          <g transform="translate(0 22)">
            {links.map((link) => {
              const column = STEPS.findIndex((step) => step.key === link.from.step);
              const width = link.students.length * unit;
              const y1 = out.get(link.from.value)! + width / 2;
              const y2 = into.get(link.to.value)! + width / 2;
              out.set(link.from.value, out.get(link.from.value)! + width);
              into.set(link.to.value, into.get(link.to.value)! + width);
              const x1 = COLUMN_X[column]! + BAR;
              const x2 = COLUMN_X[column + 1]!;
              const middle = (x1 + x2) / 2;
              return (
                <path
                  key={`${link.from.value}>${link.to.value}`}
                  data-link={`${link.from.value}>${link.to.value}`}
                  d={`M${x1} ${y1}C${middle} ${y1} ${middle} ${y2} ${x2} ${y2}`}
                  fill="none"
                  strokeWidth={width}
                  stroke={isConcern(link.to.value) ? "#eb6834" : "#6250d6"}
                  className="cursor-pointer opacity-30 transition-opacity hover:opacity-55"
                  onClick={() => onPick({ title: `${link.from.label} → ${link.to.label}`, students: link.students })}
                >
                  <title>{`${link.from.label} → ${link.to.label}: ${link.students.length} siswa`}</title>
                </path>
              );
            })}
            {columns.map((column, index) =>
              column.map((node) => {
                const y = top.get(node.value)!;
                const height = node.students.length * unit;
                const last = index === columns.length - 1;
                return (
                  <g key={node.value}>
                    <rect x={COLUMN_X[index]} y={y} width={BAR} height={height} rx={2} fill={isConcern(node.value) ? "#eb6834" : "#6250d6"} />
                    <text
                      x={last ? COLUMN_X[index]! + BAR + 8 : index === 0 ? COLUMN_X[index]! - 8 : COLUMN_X[index]! + BAR + 6}
                      y={y + height / 2 + 4}
                      textAnchor={index === 0 ? "end" : "start"}
                      className="fill-foreground text-[12px] font-medium"
                    >
                      {node.label} · {node.students.length}
                    </text>
                  </g>
                );
              }),
            )}
          </g>
          {STEPS.map((step, index) => (
            <text key={step.key} x={COLUMN_X[index]! + BAR / 2} y={12} textAnchor="middle" className="fill-muted-foreground text-[12px]">
              {step.title}
            </text>
          ))}
        </svg>
        <ul aria-label="Rute siswa" className="flex flex-col gap-1">
          {routes.map((route) => (
            <li key={route.steps.join(">")}>
              <button
                type="button"
                onClick={() => onPick({ title: route.steps.join(" → "), students: route.students })}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", route.concern ? "bg-[#eb6834]" : "bg-[#6250d6]")} />
                <span className="min-w-0 flex-1">{route.steps.join(" → ")}</span>
                <span className="shrink-0 font-semibold tabular-nums">{route.students.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ClassMap({
  students,
  rules,
  shown,
  onPick,
}: {
  students: Traveller[];
  rules: AssignmentAnalytics["journeyRules"];
  shown: Pick;
  onPick: (pick: Pick) => void;
}) {
  const left = (words: number) => (Math.min(words, MAP_MAX_WORDS) / MAP_MAX_WORDS) * 100;
  const bottom = (change: number) => (Math.min(change, MAP_MAX_CHANGE) / MAP_MAX_CHANGE) * 100;
  const splitX = left(rules.strongDraftWords);
  const splitY = bottom(rules.deepRevisionPercent);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Peta kelas</CardTitle>
        <CardDescription>
          Satu tanda satu siswa. Garis di {rules.strongDraftWords} kata dan {rules.deepRevisionPercent}% perubahan; teks tempelan tidak dihitung sebagai perubahan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 gap-y-1">
          <span className="flex items-center justify-center text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180">Revisi sendiri</span>
          <div className="relative h-72 overflow-hidden rounded-xl bg-muted/40">
            <span aria-hidden="true" className="absolute bottom-0 left-0 bg-[#eb6834]/10" style={{ width: `${splitX}%`, height: `${splitY}%` }} />
            <span aria-hidden="true" className="absolute inset-y-0 border-l border-dashed border-border" style={{ left: `${splitX}%` }} />
            <span aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${splitY}%` }} />
            <span className="absolute top-2 left-2 text-xs text-muted-foreground">Berkembang</span>
            <span className="absolute top-2 right-2 text-right text-xs text-muted-foreground">Mandiri</span>
            <span className="absolute right-2 bottom-2 text-right text-xs text-muted-foreground">Revisi tipis</span>
            <span className="absolute bottom-2 left-2 text-xs font-medium">Perlu didekati</span>
            {students.map((student) => {
              const talk = needsTalk(student.journey, rules);
              return (
                <button
                  key={student.membershipId}
                  type="button"
                  aria-label={`${student.name}: ${evidenceOf(student.journey)}`}
                  title={student.name}
                  onClick={() => onPick({ title: student.name, students: [student] })}
                  className="absolute grid size-7 -translate-x-1/2 translate-y-1/2 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ left: `clamp(0.875rem, ${left(student.journey.draftWords)}%, calc(100% - 0.875rem))`, bottom: `clamp(0.875rem, ${bottom(student.journey.ownChange)}%, calc(100% - 0.875rem))` }}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block size-3.5 ring-2 ring-card transition-opacity",
                      talk ? "rotate-45 rounded-[3px] bg-[#eb6834]" : "rounded-full bg-[#6250d6]",
                      !shown.students.includes(student) && "opacity-35",
                    )}
                  />
                </button>
              );
            })}
          </div>
          <span />
          <span className="text-center text-xs text-muted-foreground">Panjang draf awal</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PickedStudents({ pick, base, onClear }: { pick: Pick; base: string; onClear?: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{pick.title} · {pick.students.length} siswa</CardTitle>
        <CardDescription>Ini titik awal percakapan, bukan penilaian. Buka prosesnya sebelum menyimpulkan.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {pick.students.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada siswa di sini.</p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {pick.students.map((student) => (
              <li key={student.membershipId}>
                <Link
                  to={`${base}/analytics/${student.submissionId}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{student.name}</span>
                    <span className="block text-xs text-muted-foreground">{evidenceOf(student.journey)}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {onClear && (
          <button type="button" onClick={onClear} className="mt-1 min-h-11 self-start rounded-lg px-2 text-sm font-medium underline-offset-4 hover:underline">
            Kembali ke yang perlu didekati
          </button>
        )}
      </CardContent>
    </Card>
  );
}

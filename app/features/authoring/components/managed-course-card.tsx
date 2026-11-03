import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { formatJoinCode } from "../lib/form";
import { stagger } from "../lib/motion";
import type { ManagedCourseSummary } from "../types";
import { CopyCodeButton } from "./copy-code-button";
import { StatusBadge } from "./status-badge";

const action = { published: "Kelola", draft: "Lanjutkan", archived: "Lihat arsip" } as const;

function draftNote(joinCode: string | null) {
  return joinCode
    ? "Belum terbit: kode ini baru bisa dipakai siswa setelah course diterbitkan."
    : "Belum terbit: siswa belum bisa melihat course ini.";
}

/**
 * A course you teach, as a card on the Kelola list. The title is a stretched link
 * so the whole card opens the editor; the copy button and the action sit above it.
 */
export function ManagedCourseCard({ course, index }: { course: ManagedCourseSummary; index: number }) {
  const archived = course.status === "archived";
  const href = `/manage/courses/${course.id}`;
  // "Assignment" needs a wide tile; a narrow card (three to a row) says "Tugas".
  const stats = [
    { label: "Siswa", short: "Siswa", value: course.studentCount },
    { label: "Kuis", short: "Kuis", value: course.quizCount },
    { label: "Assignment", short: "Tugas", value: course.assignmentCount },
  ];

  return (
    <Card size="sm" data-testid="managed-course" className="enter-up relative h-full" style={stagger(index)}>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl", archived ? "bg-muted" : "bg-brand-lavender-soft")}>
            <img
              src="/game/academy.webp"
              alt=""
              width={304}
              height={360}
              className={cn("h-[2.625rem] w-auto", archived && "opacity-60 grayscale")}
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {course.subjectName}
              </span>
              <StatusBadge status={course.status} />
            </div>
            <h2 className="font-heading text-[1.0625rem] leading-snug font-bold text-pretty wrap-break-word">
              <Link
                to={href}
                className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
              >
                {course.name}
              </Link>
            </h2>
          </div>
        </div>

        {course.description ? (
          <p className="line-clamp-2 text-[0.8125rem]/relaxed text-muted-foreground">{course.description}</p>
        ) : null}
        {course.status === "draft" ? (
          <p className="rounded-[1.125rem] bg-brand-amber-soft px-3 py-2.5 text-xs/relaxed text-brand-amber-foreground">
            {draftNote(course.joinCode)}
          </p>
        ) : null}

        <dl className="@container grid grid-cols-3 gap-2">
          {stats.map(({ label, short, value }) => (
            <div key={label} className="flex min-w-0 flex-col-reverse rounded-[1.125rem] bg-surface-soft px-2.5 py-2.5">
              <dt className="truncate text-xs text-muted-foreground">
                <span className={label === short ? undefined : "@min-[17rem]:hidden"}>{short}</span>
                {label === short ? null : <span className="hidden @min-[17rem]:inline">{label}</span>}
              </dt>
              <dd className="font-heading text-xl leading-tight font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto flex flex-wrap gap-2">
          {course.joinCode ? (
            <div className="flex min-h-13 flex-[1_1_11rem] items-center justify-between gap-2 rounded-[1.125rem] bg-brand-lavender-soft py-1 pr-1 pl-3.5">
              <div className="min-w-0">
                <p className="text-[0.6875rem] leading-tight font-semibold tracking-wider text-muted-foreground uppercase">
                  Kode kelas
                </p>
                <p data-testid="managed-course-code" className="font-mono whitespace-nowrap text-[0.9375rem] leading-snug font-bold tracking-widest">
                  {formatJoinCode(course.joinCode)}
                </p>
              </div>
              <span className="relative z-10">
                <CopyCodeButton code={course.joinCode} />
              </span>
            </div>
          ) : (
            <div className="flex min-h-13 flex-[1_1_11rem] flex-col justify-center rounded-[1.125rem] bg-surface-soft px-3.5 py-1">
              <p className="text-[0.6875rem] leading-tight font-semibold tracking-wider text-muted-foreground uppercase">
                Kode kelas
              </p>
              <p className="text-sm leading-snug font-semibold text-muted-foreground">Dimatikan</p>
            </div>
          )}
          <Button
            size="xl"
            variant={archived ? "outline" : "default"}
            className={cn("relative z-10 flex-[1_1_7rem]", archived && "border-2 border-brand-lavender")}
           
            render={<Link to={href} />}
          >
            {action[course.status]}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Chip, ChipCount } from "~/components/ui/chip";
import { EmptyIllustration } from "~/components/ui/empty";
import { ManagedCourseCard } from "../components/managed-course-card";
import { NewCourseSheet } from "../components/new-course-sheet";
import { NEW_COURSE_URL, OPENED_HERE, useNewCourseSheet } from "../lib/new-course-sheet";
import { publicationStatusLabel } from "../lib/form";
import type { ManagedCourseSummary, PublicationStatus, Subject } from "../types";

type Filter = "all" | PublicationStatus;
const STATUSES: PublicationStatus[] = ["published", "draft", "archived"];

const steps = [
  { title: "Buat course", detail: "Mulai sebagai draf, belum terlihat siswa." },
  { title: "Isi materi dan kuis", detail: "Susun modul, lesson, kuis, dan assignment." },
  { title: "Terbitkan dan bagikan kode", detail: "Siswa bergabung lewat kode atau tautan." },
];

export function MyCoursesPage({ data }: { data: { courses: ManagedCourseSummary[]; subjects: Subject[] } }) {
  const { courses, subjects } = data;
  const sheet = useNewCourseSheet();
  const [filter, setFilter] = useState<Filter>("all");

  const counts = Object.fromEntries(
    STATUSES.map((status) => [status, courses.filter((course) => course.status === status).length]),
  ) as Record<PublicationStatus, number>;
  // A filter only earns its row once there are two kinds of course to tell apart.
  const kinds = STATUSES.filter((status) => counts[status] > 0);
  const active = filter === "all" || counts[filter] > 0 ? filter : "all";
  const shown = active === "all" ? courses : courses.filter((course) => course.status === active);
  const students = courses.reduce((sum, course) => sum + course.studentCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kelola course"
        description={
          courses.length > 0
            ? `${courses.length} course · ${students} siswa terdaftar`
            : "Buat, isi, dan bagikan course ke siswamu."
        }
        actions={
          courses.length > 0 ? (
            <Button variant="mint" size="xl" className="w-full md:w-auto" render={<Link to={NEW_COURSE_URL} state={OPENED_HERE} />}>
              <Plus data-icon="inline-start" strokeWidth={2.5} />
              Buat course
            </Button>
          ) : undefined
        }
      />

      {courses.length === 0 ? (
        <EmptyCourses />
      ) : (
        <>
          {kinds.length > 1 ? (
            <div
              role="group"
              aria-label="Saring menurut status"
              className="-mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
              <Chip pressed={active === "all"} onClick={() => setFilter("all")}>
                Semua <ChipCount>{courses.length}</ChipCount>
              </Chip>
              {kinds.map((status) => (
                <Chip key={status} pressed={active === status} onClick={() => setFilter(status)}>
                  {status === "archived" ? "Diarsipkan" : publicationStatusLabel[status]} <ChipCount>{counts[status]}</ChipCount>
                </Chip>
              ))}
            </div>
          ) : null}

          <section aria-label="Daftar course yang dikelola" className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {shown.map((course, index) => (
              <ManagedCourseCard key={course.id} course={course} index={index} />
            ))}
          </section>
        </>
      )}

      <p className="flex min-h-11 flex-wrap items-center justify-center gap-x-1.5 text-sm text-muted-foreground">
        Punya kode dari pengajar lain?
        <Link
          to="/courses/join"
          className="inline-flex min-h-11 items-center font-semibold text-foreground underline underline-offset-4"
        >
          Gabung ke course
        </Link>
      </p>

      <NewCourseSheet open={sheet.open} subjects={subjects} onClose={sheet.close} />
    </div>
  );
}

// No courses yet: the cat at the empty box, the three steps ahead, and the one
// button that starts them.
function EmptyCourses() {
  return (
    <section
      aria-labelledby="kosong-judul"
      className="flex flex-col items-center gap-3 overflow-hidden rounded-xl bg-card p-5 text-center shadow-card ring-1 ring-border md:grid md:grid-cols-[5fr_6fr] md:items-stretch md:gap-0 md:p-0 md:text-left"
    >
      <div className="grid size-40 place-items-center rounded-full bg-surface-soft md:size-auto md:rounded-none md:p-8">
        <EmptyIllustration alt="" width={1254} height={1254} className="mb-0 size-36 max-w-none md:size-72" />
      </div>
      <div className="flex w-full flex-col gap-3.5 md:p-10">
        <h2 id="kosong-judul" className="mt-1 font-heading text-[1.375rem] leading-snug font-bold md:mt-0 md:text-2xl">
          Kamu belum membuat course
        </h2>
        <p className="text-sm/relaxed text-muted-foreground md:text-[0.9375rem]/relaxed">
          Buat course pertamamu, isi dengan materi dan kuis, lalu undang siswa dengan kode kelas.
        </p>
        <ol className="flex flex-col gap-2 text-left">
          {steps.map((step, index) => (
            <li key={step.title} className="flex items-center gap-3 rounded-[1.125rem] bg-surface-soft px-3 py-2.5 md:px-3.5 md:py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-brand-lavender bg-card text-sm font-bold">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-snug font-semibold">{step.title}</span>
                <span className="block text-xs/snug text-muted-foreground md:text-[0.8125rem]/snug">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-1">
          <Button variant="mint" size="xl" className="w-full md:w-auto md:px-7" render={<Link to={NEW_COURSE_URL} state={OPENED_HERE} />}>
            <Plus data-icon="inline-start" strokeWidth={2.5} />
            Buat course
          </Button>
        </div>
      </div>
    </section>
  );
}

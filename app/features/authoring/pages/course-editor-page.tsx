import { BookOpenText, ClipboardList, KeyRound, NotebookPen, Plus, Settings2, Users, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ChipCount } from "~/components/ui/chip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { formatDateTime } from "~/features/lms/lib/format";
import { ActionError, useAction, useResetOnSuccess } from "../components/action-feedback";
import { ConfirmAction } from "../components/confirm-action";
import { CourseContentTab } from "../components/course-content-tab";
import { JoinCodeCard } from "../components/join-code-card";
import { StatusBadge } from "../components/status-badge";
import { WorkRow } from "../components/work-row";
import { formatJoinCode } from "../lib/form";
import type {
  CourseEditorData,
  ManagedAssignmentSummary,
  ManagedModule,
  ManagedQuizSummary,
  PublicationStatus,
  Scenario,
  Subject,
} from "../types";

// Materi is where a teacher spends their time, so it comes first and opens by default; the class (code,
// details, status) is the last tab. "overview" stays the class tab's id so old ?tab=overview links work.
const TABS = ["content", "quizzes", "assignments", "overview"] as const;
type TabName = (typeof TABS)[number];

export function CourseEditorPage({
  data,
  subjects,
  scenarios,
}: {
  data: CourseEditorData;
  subjects: Subject[];
  scenarios: Scenario[];
}) {
  const [params] = useSearchParams();
  // The tab is local state. Putting it in the router (setSearchParams) is a
  // navigation: it reloads the editor data and flashes the page skeleton on
  // every click. The URL is kept in sync only so a reload or shared link opens
  // the same tab.
  const [tab, setTab] = useState<TabName>(
    () => TABS.find((name) => name === params.get("tab")) ?? "content",
  );
  function selectTab(value: unknown) {
    const next = TABS.find((name) => name === value) ?? "content";
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  }
  const { course } = data;
  const lessonCount = data.modules.reduce((sum, module) => sum + module.lessons.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        crumbs={[{ label: "Kelola course", to: "/manage" }]}
        eyebrow={
          <>
            <StatusBadge status={course.status} />
            <Badge variant="outline">{course.subjectName}</Badge>
          </>
        }
        title={course.name}
        description={course.description}
        meta={
          <>
            <span className="flex items-center gap-1.5 tabular-nums">
              <Users className="size-4" aria-hidden="true" />
              {data.studentCount} siswa
            </span>
            <button
              type="button"
              onClick={() => selectTab("overview")}
              className="flex min-h-8 items-center gap-1.5 rounded-full underline-offset-4 hover:text-foreground hover:underline"
            >
              <KeyRound className="size-4" aria-hidden="true" />
              {course.joinCode ? <>Kode <span className="font-mono font-semibold tracking-wider">{formatJoinCode(course.joinCode)}</span></> : "Kode kelas mati"}
            </button>
          </>
        }
        actions={
          course.status !== "published" ? (
            <PublishCourse status={course.status} ready={lessonCount > 0} />
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={selectTab}>
        {/* The strip bleeds to the screen edge on a phone and scrolls sideways when the four do not fit. */}
        <TabsList variant="chips" className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsTrigger value="content">
            <BookOpenText aria-hidden="true" />
            Materi <ChipCount>{data.modules.length}</ChipCount>
          </TabsTrigger>
          <TabsTrigger value="quizzes">
            <ClipboardList aria-hidden="true" />
            Kuis <ChipCount>{data.quizzes.length}</ChipCount>
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <NotebookPen aria-hidden="true" />
            Assignment <ChipCount>{data.assignments.length}</ChipCount>
          </TabsTrigger>
          <TabsTrigger value="overview">
            <Settings2 aria-hidden="true" />
            Kelas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-5">
          <CourseContentTab modules={data.modules} />
        </TabsContent>

        <TabsContent value="quizzes" className="mt-5">
          <QuizzesTab quizzes={data.quizzes} modules={data.modules} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-5">
          <AssignmentsTab assignments={data.assignments} scenarios={scenarios} modules={data.modules} />
        </TabsContent>

        <TabsContent value="overview" className="mt-5 grid items-start gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <JoinCodeCard joinCode={course.joinCode} courseStatus={course.status} />
            <CourseStatusCard status={course.status} studentCount={data.studentCount} />
          </div>
          <CourseDetailsCard course={course} subjects={subjects} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** The one step left before students can join: shown in the header only while the course is not live. */
function PublishCourse({ status, ready }: { status: PublicationStatus; ready: boolean }) {
  const { pending, error, submit } = useAction();
  return (
    <div className="flex flex-col items-start gap-1.5 md:items-end">
      <Button type="button" variant="mint" size="touch" loading={pending} onClick={() => submit({ intent: "course-status", status: "published" })}>
        {status === "archived" ? "Terbitkan lagi" : "Terbitkan course"}
      </Button>
      {!ready && status === "draft" ? <p className="text-xs text-muted-foreground">Belum ada lesson. Siswa akan melihat course kosong.</p> : null}
      <ActionError error={error} />
    </div>
  );
}

/** Archiving and going back to draft: rare, so they live with the class settings, not in the header. */
function CourseStatusCard({ status, studentCount }: { status: PublicationStatus; studentCount: number }) {
  const { pending, error, submit } = useAction();
  const change = (next: PublicationStatus) => submit({ intent: "course-status", status: next });
  if (status === "archived") return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[1.0625rem] font-bold">Status course</CardTitle>
        <CardDescription>
          {status === "published"
            ? "Course terbit: siswa bisa bergabung dan mengerjakan isinya."
            : "Course masih draf: belum terlihat siswa."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ActionError error={error} />
        <div className="flex flex-wrap gap-2">
          {status === "published" ? (
            <ConfirmAction
              label="Arsipkan course"
              title="Arsipkan course ini?"
              description="Siswa masih bisa melihat isinya, tapi tidak ada yang bisa bergabung atau mengumpulkan tugas baru."
              confirmLabel="Arsipkan"
              variant="outline"
              size="touch"
              disabled={pending}
              onConfirm={() => change("archived")}
            />
          ) : null}
          {status === "published" && studentCount === 0 ? (
            <Button type="button" variant="ghost" size="touch" disabled={pending} onClick={() => change("draft")}>
              Kembali ke draf
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/** A list with its "+ new" button above it; the form opens in place, and is open already when the list is empty. */
function ListWithCreate({
  count,
  noun,
  form,
  children,
}: {
  count: number;
  noun: string;
  form: (close: () => void) => ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const showForm = open || count === 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {count > 0 ? `${count} ${noun}` : `Belum ada ${noun}.`}
        </p>
        {count > 0 && !open ? (
          <Button type="button" variant="mint" size="tap" onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" strokeWidth={2.5} />
            {noun[0]!.toUpperCase() + noun.slice(1)} baru
          </Button>
        ) : null}
      </div>
      {showForm ? (
        <div className="enter-up relative rounded-3xl border-2 border-dashed p-4 sm:p-5">
          {count > 0 ? (
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Tutup" className="absolute top-3 right-3" onClick={() => setOpen(false)}>
              <X />
            </Button>
          ) : null}
          {form(() => setOpen(false))}
        </div>
      ) : null}
      {count > 0 ? children : null}
    </div>
  );
}

const moduleTitle = (modules: ManagedModule[], id: string | null) =>
  id ? (modules.find((module) => module.id === id)?.title ?? null) : null;

function CourseDetailsCard({
  course,
  subjects,
}: {
  course: CourseEditorData["course"];
  subjects: Subject[];
}) {
  const { fetcher, pending, error } = useAction();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[1.0625rem] font-bold">Detail course</CardTitle>
      </CardHeader>
      <CardContent>
        <fetcher.Form
          method="post"
          key={`${course.name}|${course.description}|${course.subjectId}`}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="intent" value="course-update" />
          <ActionError error={error} />
          <Field>
            <FieldLabel htmlFor="course-name">Nama course</FieldLabel>
            <Input id="course-name" name="name" variant="soft" required maxLength={120} defaultValue={course.name} />
          </Field>
          <Field>
            <FieldLabel htmlFor="course-subject">Mata pelajaran</FieldLabel>
            <NativeSelect id="course-subject" name="subjectId" variant="soft" defaultValue={course.subjectId}>
              {subjects.map((subject) => (
                <NativeSelectOption key={subject.id} value={subject.id}>
                  {subject.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="course-description">Deskripsi</FieldLabel>
            <Textarea
              id="course-description"
              name="description"
              variant="soft"
              rows={4}
              maxLength={2000}
              defaultValue={course.description ?? ""}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="mint" size="xl" loading={pending} className="w-full sm:w-auto">
              Simpan perubahan
            </Button>
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function QuizzesTab({ quizzes, modules }: { quizzes: ManagedQuizSummary[]; modules: ManagedModule[] }) {
  const { fetcher, pending, error } = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  useResetOnSuccess(fetcher, formRef);

  return (
    <ListWithCreate
      count={quizzes.length}
      noun="kuis"
      form={() => (
        <fetcher.Form ref={formRef} method="post" className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="quiz-create" />
          <div className="pr-10">
            <p className="font-heading text-lg font-semibold">Kuis baru</p>
            <p className="text-sm text-muted-foreground">Pilihan ganda dan isian singkat, dinilai otomatis. Soal ditambahkan di halaman kuis.</p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <Field className="min-w-52 flex-1">
              <FieldLabel htmlFor="new-quiz-title" className="font-semibold">Judul kuis</FieldLabel>
              <Input id="new-quiz-title" name="title" variant="soft" required maxLength={160} placeholder="mis. Kuis Bab 1" />
            </Field>
            <Field className="sm:w-48">
              <FieldLabel htmlFor="new-quiz-limit" className="font-semibold">Batas waktu (menit)</FieldLabel>
              <Input id="new-quiz-limit" name="timeLimitMinutes" variant="soft" type="number" min={1} max={600} placeholder="Tanpa batas" />
            </Field>
            <Button type="submit" variant="mint" size="xl" loading={pending} className="w-full sm:w-auto">
              <Plus data-icon="inline-start" strokeWidth={2.5} />
              Buat kuis
            </Button>
          </div>
          <ActionError error={error} />
        </fetcher.Form>
      )}
    >
      <ul className="divide-y divide-border overflow-hidden rounded-2xl ring-1 ring-border" aria-label="Daftar kuis">
        {quizzes.map((quiz, index) => (
          <WorkRow
            key={quiz.id}
            index={index}
            testId="quiz-row"
            title={quiz.title}
            status={quiz.status}
            href={`/manage/quizzes/${quiz.id}`}
            meta={[
              moduleTitle(modules, quiz.moduleId),
              `${quiz.questionCount} soal`,
              `${quiz.attemptCount} pengerjaan`,
              quiz.dueAt ? `batas ${formatDateTime(quiz.dueAt)}` : null,
            ].filter(Boolean).join(" · ")}
          />
        ))}
      </ul>
    </ListWithCreate>
  );
}

function AssignmentsTab({
  assignments,
  scenarios,
  modules,
}: {
  assignments: ManagedAssignmentSummary[];
  scenarios: Scenario[];
  modules: ManagedModule[];
}) {
  const { fetcher, pending, error } = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  useResetOnSuccess(fetcher, formRef);

  return (
    <ListWithCreate
      count={assignments.length}
      noun="assignment"
      form={() => (
        <div className="flex flex-col gap-4">
          <div className="pr-10">
            <p className="font-heading text-lg font-semibold">Assignment baru</p>
            <p className="text-sm text-muted-foreground">
              Lima tahap dengan AI Tutor yang membimbing, bukan memberi jawaban. Rubrik skenario disalin dan bisa kamu sesuaikan.
            </p>
          </div>
          {scenarios.length === 0 ? (
            <Alert variant="note">
              <AlertTitle>Belum ada skenario</AlertTitle>
              <AlertDescription>Skenario disiapkan oleh tim NALAR dan belum tersedia di server ini.</AlertDescription>
            </Alert>
          ) : (
            <fetcher.Form ref={formRef} method="post" className="flex flex-col gap-4">
              <input type="hidden" name="intent" value="assignment-create" />
              <ActionError error={error} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="new-assignment-scenario" className="font-semibold">Skenario</FieldLabel>
                  <NativeSelect id="new-assignment-scenario" name="scenarioId" variant="soft" required defaultValue="">
                    <NativeSelectOption value="" disabled>
                      Pilih skenario
                    </NativeSelectOption>
                    {scenarios.map((scenario) => (
                      <NativeSelectOption key={scenario.id} value={scenario.id}>
                        {scenario.title} — {scenario.subjectName}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-assignment-title" className="font-semibold">Judul (opsional)</FieldLabel>
                  <Input id="new-assignment-title" name="title" variant="soft" maxLength={160} placeholder="Kosongkan untuk memakai judul skenario" />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="mint" size="xl" loading={pending} className="w-full sm:w-auto">
                  <Plus data-icon="inline-start" strokeWidth={2.5} />
                  Buat assignment
                </Button>
              </div>
            </fetcher.Form>
          )}
        </div>
      )}
    >
      <ul className="divide-y divide-border overflow-hidden rounded-2xl ring-1 ring-border" aria-label="Daftar assignment">
        {assignments.map((assignment, index) => (
          <WorkRow
            key={assignment.id}
            index={index}
            testId="assignment-row"
            title={assignment.title}
            status={assignment.status}
            href={`/manage/assignments/${assignment.id}`}
            meta={[
              moduleTitle(modules, assignment.moduleId),
              `Skenario: ${assignment.scenarioTitle}`,
              `${assignment.submissionCount} pengerjaan`,
              assignment.dueAt ? `batas ${formatDateTime(assignment.dueAt)}` : null,
            ].filter(Boolean).join(" · ")}
          />
        ))}
      </ul>
    </ListWithCreate>
  );
}

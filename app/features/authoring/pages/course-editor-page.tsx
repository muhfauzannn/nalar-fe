import { KeyRound, Plus, Users, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ChipCount } from "~/components/ui/chip";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { formatDateTime } from "~/features/lms/lib/format";
import { ActionError, useAction, useResetOnSuccess } from "../components/action-feedback";
import { CourseContentTab } from "../components/course-content-tab";
import { SaveBar, useFormPart } from "../components/editor-kit";
import { StatusMenu, type StatusChoice } from "../components/status-menu";
import { Sticker } from "~/features/labs/craft/stickers/Sticker";
import { buku, catatan, dokumen, small } from "~/features/labs/craft/stickers/editor-icons";
import type { Icon } from "~/features/labs/craft/stickers/fun";
import { BENGKEL, gir } from "~/features/labs/craft/stickers/icons";
import { JoinCodeCard } from "../components/join-code-card";
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
// the same stickers and lavender chosen tab as the lesson editor's tabs
const TAB_ICONS: Record<TabName, Icon> = { content: small(buku), quizzes: small(catatan), assignments: small(dokumen), overview: small(gir) };
const TAB_CLASS =
  "h-11 gap-1 pl-2.5 data-active:bg-brand-lavender-soft data-active:text-brand-lavender-foreground data-active:ring-2 data-active:ring-brand-lavender";

function TabSticker({ tab, current }: { tab: TabName; current: TabName }) {
  return (
    <span className="-my-1.5 size-8 shrink-0" aria-hidden="true">
      <Sticker icon={TAB_ICONS[tab]} palette={BENGKEL} loop={tab === current} replayOnHover label="" />
    </span>
  );
}

/** Live needs nothing; going back to draft only while no student has joined; an archive can go live again. */
function courseChoices(status: PublicationStatus, studentCount: number): StatusChoice<PublicationStatus>[] {
  const draft = { value: "draft" as const, label: status === "draft" ? "Draf" : "Kembali ke draf", disabled: status !== "draft" && studentCount > 0 };
  if (status === "draft") return [draft, { value: "published", label: "Terbitkan" }];
  if (status === "published") return [{ value: "published", label: "Terbit" }, draft, { value: "archived", label: "Arsipkan" }];
  return [{ value: "archived", label: "Arsip" }, { value: "published", label: "Terbitkan lagi" }, draft];
}

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
  const status = useAction();
  const lessonCount = data.modules.reduce((sum, module) => sum + module.lessons.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        crumbs={[{ label: "Kelola course", to: "/manage" }]}
        eyebrow={
          <>
            <StatusMenu
              status={course.status}
              noun="course"
              pending={status.pending}
              choices={courseChoices(course.status, data.studentCount)}
              onChange={(next) => status.submit({ intent: "course-status", status: next })}
            />
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
            <PublishCourse status={course.status} ready={lessonCount > 0} action={status} />
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={selectTab}>
        {/* The strip bleeds to the screen edge on a phone and scrolls sideways when the four do not fit. */}
        <TabsList variant="chips" className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsTrigger value="content" className={TAB_CLASS}>
            <TabSticker tab="content" current={tab} />
            Materi <ChipCount>{data.modules.length}</ChipCount>
          </TabsTrigger>
          <TabsTrigger value="quizzes" className={TAB_CLASS}>
            <TabSticker tab="quizzes" current={tab} />
            Kuis <ChipCount>{data.quizzes.length}</ChipCount>
          </TabsTrigger>
          <TabsTrigger value="assignments" className={TAB_CLASS}>
            <TabSticker tab="assignments" current={tab} />
            Assignment <ChipCount>{data.assignments.length}</ChipCount>
          </TabsTrigger>
          <TabsTrigger value="overview" className={TAB_CLASS}>
            <TabSticker tab="overview" current={tab} />
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
          <JoinCodeCard joinCode={course.joinCode} courseStatus={course.status} />
          <CourseDetails course={course} subjects={subjects} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** The one step left before students can join: shown in the header only while the course is not live. */
function PublishCourse({
  status,
  ready,
  action: { pending, error, submit },
}: {
  status: PublicationStatus;
  ready: boolean;
  action: ReturnType<typeof useAction>;
}) {
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

/** Name, subject and description; saved from the floating bar like every other editor form. */
function CourseDetails({
  course,
  subjects,
}: {
  course: CourseEditorData["course"];
  subjects: Subject[];
}) {
  const { fetcher, pending, error } = useAction();
  const form = useRef<HTMLFormElement>(null);
  const version = `${course.name}|${course.description}|${course.subjectId}`;
  const part = useFormPart(form, version);
  return (
    <section aria-labelledby="course-details-title" className="flex flex-col gap-4 rounded-3xl p-1">
      <div>
        <h2 id="course-details-title" className="font-heading text-xl font-semibold tracking-tight">Detail course</h2>
        <p className="text-sm text-muted-foreground">Yang dilihat siswa di daftar course dan di pulau kelasnya.</p>
      </div>
      <fetcher.Form ref={form} method="post" key={version} className="flex flex-col gap-4">
        <input type="hidden" name="intent" value="course-update" />
        <ActionError error={error} />
        <Field>
          <FieldLabel htmlFor="course-name" className="font-semibold">Nama course</FieldLabel>
          <Input id="course-name" name="name" variant="soft" required maxLength={120} defaultValue={course.name} />
        </Field>
        <Field>
          <FieldLabel htmlFor="course-subject" className="font-semibold">Mata pelajaran</FieldLabel>
          <NativeSelect id="course-subject" name="subjectId" variant="soft" defaultValue={course.subjectId}>
            {subjects.map((subject) => (
              <NativeSelectOption key={subject.id} value={subject.id}>
                {subject.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="course-description" className="font-semibold">Deskripsi</FieldLabel>
          <Textarea id="course-description" name="description" variant="soft" rows={4} maxLength={2000} defaultValue={course.description ?? ""} />
        </Field>
      </fetcher.Form>
      <SaveBar parts={[part]} pending={pending} error={error} />
    </section>
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

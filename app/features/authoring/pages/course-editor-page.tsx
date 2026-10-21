import { ArrowRight, Plus, Users } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { formatDateTime } from "~/features/lms/lib/format";
import { ActionError, useAction, useResetOnSuccess } from "../components/action-feedback";
import { CourseContentTab } from "../components/course-content-tab";
import { JoinCodeCard } from "../components/join-code-card";
import { ListItem } from "../components/list-item";
import { StatusBadge } from "../components/status-badge";
import type {
  CourseEditorData,
  ManagedAssignmentSummary,
  ManagedQuizSummary,
  PublicationStatus,
  Scenario,
  Subject,
} from "../types";

const TABS = ["overview", "content", "quizzes", "assignments"] as const;
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
    () => TABS.find((name) => name === params.get("tab")) ?? "overview",
  );
  function selectTab(value: unknown) {
    const next = TABS.find((name) => name === value) ?? "overview";
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  }
  const { course } = data;

  return (
    <div className="flex flex-col gap-8">
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
          <span className="flex items-center gap-1.5 tabular-nums">
            <Users className="size-4" aria-hidden="true" />
            {data.studentCount} siswa
          </span>
        }
        actions={<CourseStatusActions status={course.status} studentCount={data.studentCount} />}
      />

      <Tabs value={tab} onValueChange={selectTab}>
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-fit">
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="content">Materi ({data.modules.length})</TabsTrigger>
          <TabsTrigger value="quizzes">Kuis ({data.quizzes.length})</TabsTrigger>
          <TabsTrigger value="assignments">Assignment ({data.assignments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-6 lg:grid-cols-2">
          <JoinCodeCard
            joinCode={course.joinCode}
            courseStatus={course.status}
            studentCount={data.studentCount}
          />
          <CourseDetailsCard course={course} subjects={subjects} />
        </TabsContent>

        <TabsContent value="content" className="mt-4">
          <CourseContentTab modules={data.modules} />
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          <QuizzesTab quizzes={data.quizzes} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <AssignmentsTab assignments={data.assignments} scenarios={scenarios} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CourseStatusActions({
  status,
  studentCount,
}: {
  status: PublicationStatus;
  studentCount: number;
}) {
  const { pending, error, submit } = useAction();
  const change = (next: PublicationStatus) => submit({ intent: "course-status", status: next });
  const canDraft = studentCount === 0;

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap gap-2 md:justify-end">
        {status !== "published" ? (
          <Button type="button" loading={pending} onClick={() => change("published")}>
            {status === "archived" ? "Terbitkan lagi" : "Terbitkan course"}
          </Button>
        ) : null}
        {status === "published" ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => change("archived")}>
            Arsipkan
          </Button>
        ) : null}
        {status !== "draft" && canDraft ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => change("draft")}>
            Kembali ke draf
          </Button>
        ) : null}
      </div>
      <ActionError error={error} />
    </div>
  );
}

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
        <CardTitle>Detail course</CardTitle>
        <CardDescription>Nama dan deskripsi tampil di kartu course milik siswa.</CardDescription>
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
            <Input id="course-name" name="name" required maxLength={120} defaultValue={course.name} />
          </Field>
          <Field>
            <FieldLabel htmlFor="course-subject">Mata pelajaran</FieldLabel>
            <NativeSelect id="course-subject" name="subjectId" defaultValue={course.subjectId}>
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
              rows={4}
              maxLength={2000}
              defaultValue={course.description ?? ""}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Simpan perubahan
            </Button>
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function QuizzesTab({ quizzes }: { quizzes: ManagedQuizSummary[] }) {
  const { fetcher, pending, error } = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  useResetOnSuccess(fetcher, formRef);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kuis baru</CardTitle>
          <CardDescription>
            Kuis pilihan ganda dan isian singkat yang dinilai otomatis. Soal ditambahkan di halaman kuis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fetcher.Form ref={formRef} method="post" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="intent" value="quiz-create" />
            <Field className="min-w-52 flex-1">
              <FieldLabel htmlFor="new-quiz-title">Judul kuis</FieldLabel>
              <Input id="new-quiz-title" name="title" required maxLength={160} placeholder="mis. Kuis Bab 1" />
            </Field>
            <Field className="w-40">
              <FieldLabel htmlFor="new-quiz-limit">Batas waktu (menit)</FieldLabel>
              <Input id="new-quiz-limit" name="timeLimitMinutes" type="number" min={1} max={600} placeholder="Tanpa batas" />
            </Field>
            <Button type="submit" loading={pending}>
              <Plus data-icon="inline-start" />
              Buat kuis
            </Button>
          </fetcher.Form>
          {error ? <div className="mt-3"><ActionError error={error} /></div> : null}
        </CardContent>
      </Card>

      {quizzes.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada kuis.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Daftar kuis">
          {quizzes.map((quiz, index) => (
            <ListItem key={quiz.id} index={index}>
              <Card data-testid="quiz-row">
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={quiz.status} />
                      <span className="font-medium">{quiz.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {quiz.questionCount} soal · {quiz.attemptCount} pengerjaan
                      {quiz.dueAt ? ` · batas ${formatDateTime(quiz.dueAt)}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" render={<Link to={`/manage/quizzes/${quiz.id}`} />}>
                    Buka editor
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </CardContent>
              </Card>
            </ListItem>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssignmentsTab({
  assignments,
  scenarios,
}: {
  assignments: ManagedAssignmentSummary[];
  scenarios: Scenario[];
}) {
  const { fetcher, pending, error } = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  useResetOnSuccess(fetcher, formRef);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignment baru</CardTitle>
          <CardDescription>
            Assignment NALAR berjalan dalam lima tahap dengan AI Tutor yang membimbing, bukan memberi
            jawaban. Pilih skenario; rubriknya disalin dan bisa kamu sesuaikan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scenarios.length === 0 ? (
            <Alert>
              <AlertTitle>Belum ada skenario</AlertTitle>
              <AlertDescription>
                Skenario disiapkan oleh tim NALAR dan belum tersedia di server ini.
              </AlertDescription>
            </Alert>
          ) : (
            <fetcher.Form ref={formRef} method="post" className="flex flex-col gap-4">
              <input type="hidden" name="intent" value="assignment-create" />
              <ActionError error={error} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="new-assignment-scenario">Skenario</FieldLabel>
                  <NativeSelect id="new-assignment-scenario" name="scenarioId" required defaultValue="">
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
                  <FieldLabel htmlFor="new-assignment-title">Judul (opsional)</FieldLabel>
                  <Input
                    id="new-assignment-title"
                    name="title"
                    maxLength={160}
                    placeholder="Kosongkan untuk memakai judul skenario"
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={pending}>
                  <Plus data-icon="inline-start" />
                  Buat assignment
                </Button>
              </div>
            </fetcher.Form>
          )}
        </CardContent>
      </Card>

      {assignments.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada assignment.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Daftar assignment">
          {assignments.map((assignment, index) => (
            <ListItem key={assignment.id} index={index}>
              <Card data-testid="assignment-row">
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={assignment.status} />
                      <span className="font-medium">{assignment.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Skenario: {assignment.scenarioTitle} · {assignment.submissionCount} pengerjaan
                      {assignment.dueAt ? ` · batas ${formatDateTime(assignment.dueAt)}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link to={`/manage/assignments/${assignment.id}`} />}
                  >
                    Buka editor
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </CardContent>
              </Card>
            </ListItem>
          ))}
        </ul>
      )}
    </div>
  );
}

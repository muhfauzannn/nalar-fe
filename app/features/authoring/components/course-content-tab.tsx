import { Archive, ArchiveRestore, Eye, EyeOff, FilePenLine, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { ManagedLessonSummary, ManagedModule, PublicationStatus } from "../types";
import { ActionError, useAction, useOnSuccess, useResetOnSuccess } from "./action-feedback";
import { optimisticOrder, useFlip } from "../lib/motion";
import { ListItem } from "./list-item";
import { ReorderControls } from "./reorder-controls";
import { StatusBadge } from "./status-badge";

export function CourseContentTab({ modules }: { modules: ManagedModule[] }) {
  const order = useAction();
  // Show the requested order immediately; the server confirms a moment later.
  const shown = optimisticOrder(modules, order.formData);
  const ids = shown.map((module) => module.id);
  const flip = useFlip<HTMLOListElement>();

  return (
    <div className="flex flex-col gap-6">
      <NewModuleForm />
      <ActionError error={order.error} />

      {modules.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada modul. Modul mengelompokkan lesson; tambahkan yang pertama di atas.
        </p>
      ) : (
        <ol ref={flip.ref} className="flex flex-col gap-5" aria-label="Daftar modul">
          {shown.map((module, index) => (
            <ListItem key={module.id} flipKey={module.id} index={index}>
              <ModuleCard
                module={module}
                orderControls={
                  <ReorderControls
                    ids={ids}
                    index={index}
                    label={`modul ${module.title}`}
                    onChange={(next) => {
                      flip.capture();
                      order.submit({ intent: "module-order", ids: JSON.stringify(next) });
                    }}
                  />
                }
              />
            </ListItem>
          ))}
        </ol>
      )}
    </div>
  );
}

function NewModuleForm() {
  const { fetcher, pending, error } = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  useResetOnSuccess(fetcher, formRef);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tambah modul</CardTitle>
      </CardHeader>
      <CardContent>
        <fetcher.Form ref={formRef} method="post" className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="module-create" />
          <ActionError error={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="new-module-title">Judul modul</FieldLabel>
              <Input id="new-module-title" name="title" required maxLength={120} placeholder="mis. Bab 1 — Gerak Lurus" />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-module-description">Deskripsi (opsional)</FieldLabel>
              <Input id="new-module-description" name="description" maxLength={1000} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Field orientation="horizontal" className="w-auto">
              <Checkbox id="new-module-publish" name="publish" defaultChecked />
              <FieldLabel htmlFor="new-module-publish" className="text-muted-foreground">
                Terbitkan langsung
              </FieldLabel>
            </Field>
            <Button type="submit" size="sm" loading={pending}>
              <Plus data-icon="inline-start" />
              Tambah modul
            </Button>
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function StatusActions({
  status,
  pending,
  onChange,
  noun,
}: {
  status: PublicationStatus;
  pending: boolean;
  onChange: (status: PublicationStatus) => void;
  noun: string;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {status === "draft" ? (
        <Button type="button" size="xs" variant="outline" disabled={pending} onClick={() => onChange("published")}>
          <Eye /> Terbitkan
        </Button>
      ) : null}
      {status === "published" ? (
        <Button type="button" size="xs" variant="ghost" disabled={pending} onClick={() => onChange("draft")}>
          <EyeOff /> Jadikan draf
        </Button>
      ) : null}
      {status === "archived" ? (
        <Button type="button" size="xs" variant="outline" disabled={pending} onClick={() => onChange("draft")}>
          <ArchiveRestore /> Pulihkan
        </Button>
      ) : (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={pending}
          aria-label={`Arsipkan ${noun}`}
          onClick={() => onChange("archived")}
        >
          <Archive /> Arsipkan
        </Button>
      )}
    </span>
  );
}

function ModuleCard({
  module,
  orderControls,
}: {
  module: ManagedModule;
  orderControls: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const status = useAction();
  const edit = useAction();
  const lessonOrder = useAction();
  const lessons = optimisticOrder(module.lessons, lessonOrder.formData);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const lessonFlip = useFlip<HTMLUListElement>();
  const archived = module.status === "archived";
  useOnSuccess(edit.fetcher, () => setEditing(false));

  return (
    <Card className={archived ? "bg-muted/40" : undefined} data-testid="module-card">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {orderControls}
          <CardTitle className="min-w-0 flex-1 font-heading text-lg text-pretty wrap-break-word">{module.title}</CardTitle>
          <StatusBadge status={module.status} />
        </div>
        {module.description ? (
          <p className="text-sm text-muted-foreground">{module.description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" size="xs" variant="ghost" onClick={() => setEditing((value) => !value)}>
            <FilePenLine /> {editing ? "Tutup" : "Ubah"}
          </Button>
          <StatusActions
            status={module.status}
            pending={status.pending}
            noun={`modul ${module.title}`}
            onChange={(next) => status.submit({ intent: "module-status", moduleId: module.id, status: next })}
          />
        </div>
        <ActionError error={status.error} />
        {editing ? (
          <edit.fetcher.Form
            method="post"
            className="enter-up grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input type="hidden" name="intent" value="module-update" />
            <input type="hidden" name="moduleId" value={module.id} />
            <Input name="title" required maxLength={120} defaultValue={module.title} aria-label="Judul modul" />
            <Input
              name="description"
              maxLength={1000}
              defaultValue={module.description ?? ""}
              aria-label="Deskripsi modul"
              placeholder="Deskripsi (opsional)"
            />
            <Button type="submit" size="sm" disabled={edit.pending}>
              Simpan
            </Button>
          </edit.fetcher.Form>
        ) : null}
        <ActionError error={edit.error} />
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ActionError error={lessonOrder.error} />
        {lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada lesson di modul ini.</p>
        ) : (
          <ul ref={lessonFlip.ref} className="flex flex-col gap-2" aria-label={`Lesson di ${module.title}`}>
            {lessons.map((lesson, index) => (
              <LessonRow
                key={lesson.id}
                index={index}
                lesson={lesson}
                orderControls={
                  <ReorderControls
                    ids={lessonIds}
                    index={index}
                    label={`lesson ${lesson.title}`}
                    onChange={(next) => {
                      lessonFlip.capture();
                      lessonOrder.submit({
                        intent: "lesson-order",
                        moduleId: module.id,
                        ids: JSON.stringify(next),
                      });
                    }}
                  />
                }
              />
            ))}
          </ul>
        )}
        <NewLessonForm moduleId={module.id} />
      </CardContent>
    </Card>
  );
}

function LessonRow({
  lesson,
  index,
  orderControls,
}: {
  lesson: ManagedLessonSummary;
  index: number;
  orderControls: React.ReactNode;
}) {
  const status = useAction();
  return (
    <ListItem
      flipKey={lesson.id}
      index={index}
      data-testid="lesson-row"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5",
        lesson.status === "archived" && "bg-muted/40",
      )}
    >
      {orderControls}
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
        <Link
          to={`/manage/lessons/${lesson.id}`}
          className="line-clamp-2 font-medium wrap-break-word underline-offset-4 hover:underline"
        >
          {lesson.title}
        </Link>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge status={lesson.status} />
          {lesson.resources.length} resource
        </span>
      </div>
      <StatusActions
        status={lesson.status}
        pending={status.pending}
        noun={`lesson ${lesson.title}`}
        onChange={(next) => status.submit({ intent: "lesson-status", lessonId: lesson.id, status: next })}
      />
      {status.error ? <span className="w-full text-xs text-destructive">{status.error}</span> : null}
    </ListItem>
  );
}

function NewLessonForm({ moduleId }: { moduleId: string }) {
  const { fetcher, pending, error } = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  useResetOnSuccess(fetcher, formRef);

  return (
    <fetcher.Form ref={formRef} method="post" className="flex flex-wrap items-end gap-3 border-t pt-4">
      <input type="hidden" name="intent" value="lesson-create" />
      <input type="hidden" name="moduleId" value={moduleId} />
      <Field className="min-w-52 flex-1">
        <FieldLabel htmlFor={`new-lesson-${moduleId}`} className="text-xs text-muted-foreground">
          Lesson baru
        </FieldLabel>
        <Input id={`new-lesson-${moduleId}`} name="title" required maxLength={160} placeholder="Judul lesson" />
      </Field>
      <Field orientation="horizontal" className="w-auto pb-2">
        <Checkbox id={`new-lesson-publish-${moduleId}`} name="publish" defaultChecked />
        <FieldLabel htmlFor={`new-lesson-publish-${moduleId}`} className="text-muted-foreground">
          Terbitkan
        </FieldLabel>
      </Field>
      <Button type="submit" size="sm" variant="outline" loading={pending}>
        <Plus data-icon="inline-start" />
        Tambah lesson
      </Button>
      {error ? <div className="w-full"><ActionError error={error} /></div> : null}
    </fetcher.Form>
  );
}

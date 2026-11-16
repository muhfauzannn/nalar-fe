import { ChevronRight, FlaskConical, Paperclip, Pencil, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { LABS } from "~/features/labs";
import { cn } from "~/lib/utils";
import type { ManagedLessonSummary, ManagedModule } from "../types";
import { ActionError, useAction, useOnSuccess } from "./action-feedback";
import { optimisticOrder, useFlip } from "../lib/motion";
import { ListItem } from "./list-item";
import { ReorderControls } from "./reorder-controls";
import { StatusMenu } from "./status-menu";

/**
 * The course's material: modules in order, each with its lessons. What is already there comes first;
 * adding something is a quiet "+" at the end of its list that opens a one-line form. Status is one
 * control per row, and a lesson's row opens its editor (where its material, lab and resources live).
 */
export function CourseContentTab({ modules }: { modules: ManagedModule[] }) {
  const order = useAction();
  // Show the requested order immediately; the server confirms a moment later.
  const shown = optimisticOrder(modules, order.formData);
  const ids = shown.map((module) => module.id);
  const flip = useFlip<HTMLOListElement>();

  return (
    <div className="flex flex-col gap-5">
      <ActionError error={order.error} />
      {modules.length > 0 && (
        <ol ref={flip.ref} className="flex flex-col gap-5" aria-label="Daftar modul">
          {shown.map((module, index) => (
            <ListItem key={module.id} flipKey={module.id} index={index}>
              <ModuleBlock
                module={module}
                number={index + 1}
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
      <NewModule first={modules.length === 0} />
    </div>
  );
}

function ModuleBlock({
  module,
  number,
  orderControls,
}: {
  module: ManagedModule;
  number: number;
  orderControls: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const status = useAction();
  const edit = useAction();
  const lessonOrder = useAction();
  const lessons = optimisticOrder(module.lessons, lessonOrder.formData);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const lessonFlip = useFlip<HTMLUListElement>();
  useOnSuccess(edit.fetcher, () => setEditing(false));

  return (
    <section
      data-testid="module-card"
      aria-label={`Modul ${module.title}`}
      className={cn("rounded-3xl bg-card p-2 ring-1 ring-border", module.status === "archived" && "bg-muted/40")}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-2 pt-2 pb-3 sm:px-3">
        {orderControls}
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase tabular-nums">
          Modul {number}
        </span>
        <span className="flex-1" />
        <StatusMenu
          status={module.status}
          noun={`modul ${module.title}`}
          pending={status.pending}
          onChange={(next) => status.submit({ intent: "module-status", moduleId: module.id, status: next })}
        />
        {editing ? (
          <edit.fetcher.Form method="post" className="enter-up flex w-full flex-col gap-2 sm:flex-row">
            <input type="hidden" name="intent" value="module-update" />
            <input type="hidden" name="moduleId" value={module.id} />
            <Input name="title" required maxLength={120} defaultValue={module.title} aria-label="Judul modul" autoFocus />
            <Input
              name="description"
              maxLength={1000}
              defaultValue={module.description ?? ""}
              aria-label="Deskripsi modul"
              placeholder="Deskripsi (opsional)"
            />
            <div className="flex gap-1">
              <Button type="submit" size="sm" loading={edit.pending}>
                Simpan
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Batal
              </Button>
            </div>
          </edit.fetcher.Form>
        ) : (
          <div className="flex w-full min-w-0 items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-xl font-semibold tracking-tight text-pretty wrap-break-word">{module.title}</h3>
              {module.description ? <p className="mt-0.5 text-sm text-muted-foreground">{module.description}</p> : null}
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Ubah modul ${module.title}`}
              title="Ubah judul dan deskripsi"
              onClick={() => setEditing(true)}
            >
              <Pencil />
            </Button>
          </div>
        )}
        <ActionError error={status.error ?? edit.error} />
      </header>

      <ActionError error={lessonOrder.error} />
      {lessons.length > 0 && (
        <ul
          ref={lessonFlip.ref}
          className="divide-y divide-border overflow-hidden rounded-2xl bg-background ring-1 ring-border"
          aria-label={`Lesson di ${module.title}`}
        >
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
                    lessonOrder.submit({ intent: "lesson-order", moduleId: module.id, ids: JSON.stringify(next) });
                  }}
                />
              }
            />
          ))}
        </ul>
      )}
      <NewLesson moduleId={module.id} first={lessons.length === 0} />
    </section>
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
  const labs = lesson.labs.map((lab) => LABS[lab.labKey]?.title ?? lab.labKey);
  return (
    <ListItem
      flipKey={lesson.id}
      index={index}
      data-testid="lesson-row"
      className={cn("relative flex items-center gap-3 px-2 py-2.5 sm:px-3", lesson.status === "archived" && "bg-muted/40")}
    >
      {orderControls}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* The title stretches over the row: anywhere on it opens the lesson editor. */}
        <Link
          to={`/manage/lessons/${lesson.id}`}
          className="line-clamp-2 font-medium wrap-break-word outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50 hover:underline hover:underline-offset-4"
        >
          {lesson.title}
        </Link>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Paperclip className="size-3" aria-hidden="true" />
            {lesson.resources.length} resource
          </span>
          {labs.length > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-brand-mint-foreground">
              <FlaskConical className="size-3" aria-hidden="true" />
              {labs.join(", ")}
            </span>
          )}
        </span>
        {status.error ? <span className="text-xs text-destructive">{status.error}</span> : null}
      </div>
      <span className="relative z-10">
        <StatusMenu
          status={lesson.status}
          noun={`lesson ${lesson.title}`}
          pending={status.pending}
          onChange={(next) => status.submit({ intent: "lesson-status", lessonId: lesson.id, status: next })}
        />
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </ListItem>
  );
}

/** "+ Tambah lesson" under a module's lessons; a one-line form while open. New lessons start published. */
function NewLesson({ moduleId, first }: { moduleId: string; first: boolean }) {
  const [open, setOpen] = useState(false);
  const { fetcher, pending, error } = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  useOnSuccess(fetcher, () => formRef.current?.reset());

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
          first ? "mt-0 border border-dashed justify-center" : "mt-1",
        )}
      >
        <Plus className="size-4" aria-hidden="true" />
        {first ? "Tambah lesson pertama" : "Tambah lesson"}
      </button>
    );
  }
  return (
    <fetcher.Form ref={formRef} method="post" className="enter-up mt-2 flex flex-col gap-2 px-1 pb-1">
      <input type="hidden" name="intent" value="lesson-create" />
      <input type="hidden" name="moduleId" value={moduleId} />
      <input type="hidden" name="publish" value="on" />
      <div className="flex gap-2">
        <Input name="title" required maxLength={160} placeholder="Judul lesson baru" aria-label="Judul lesson baru" autoFocus className="h-11" />
        <Button type="submit" size="tap" loading={pending}>
          Tambah
        </Button>
        <Button type="button" size="icon-tap" variant="ghost" aria-label="Tutup" onClick={() => setOpen(false)}>
          <X />
        </Button>
      </div>
      <ActionError error={error} />
    </fetcher.Form>
  );
}

/** "+ Tambah modul" after the last module; open from the start when the course has none. */
function NewModule({ first }: { first: boolean }) {
  const [open, setOpen] = useState(first);
  const { fetcher, pending, error } = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  useOnSuccess(fetcher, () => {
    formRef.current?.reset();
    if (!first) setOpen(false);
  });

  if (!open && !first) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 items-center justify-center gap-2 rounded-3xl border-2 border-dashed text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Plus className="size-4" aria-hidden="true" />
        Tambah modul
      </button>
    );
  }
  return (
    <fetcher.Form
      ref={formRef}
      method="post"
      className="enter-up flex flex-col gap-3 rounded-3xl border-2 border-dashed p-4 sm:p-5"
      aria-label="Modul baru"
    >
      <input type="hidden" name="intent" value="module-create" />
      <input type="hidden" name="publish" value="on" />
      <div>
        <p className="font-heading text-lg font-semibold">{first ? "Mulai dengan modul pertama" : "Modul baru"}</p>
        <p className="text-sm text-muted-foreground">Modul mengelompokkan lesson, misalnya satu bab.</p>
      </div>
      <ActionError error={error} />
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input name="title" required maxLength={120} placeholder="Judul, mis. Bab 1 — Gerak Lurus" aria-label="Judul modul" className="h-11" autoFocus={!first} />
        <Input name="description" maxLength={1000} placeholder="Deskripsi (opsional)" aria-label="Deskripsi modul" className="h-11" />
        <div className="flex gap-2">
          <Button type="submit" size="tap" loading={pending} className="flex-1">
            <Plus data-icon="inline-start" />
            Tambah modul
          </Button>
          {!first && (
            <Button type="button" size="icon-tap" variant="ghost" aria-label="Tutup" onClick={() => setOpen(false)}>
              <X />
            </Button>
          )}
        </div>
      </div>
    </fetcher.Form>
  );
}

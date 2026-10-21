import { ArrowLeft, ExternalLink, FileText, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { MathText } from "~/components/math-text";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { ActionError, useAction } from "../components/action-feedback";
import { ConfirmAction } from "../components/confirm-action";
import { NativeSelect } from "../components/native-select";
import { ListItem } from "../components/list-item";
import { ReorderControls } from "../components/reorder-controls";
import { ResourceForm } from "../components/resource-form";
import { StatusBadge } from "../components/status-badge";
import { publicationStatusLabel } from "../lib/form";
import { optimisticOrder, useFlip } from "../lib/motion";
import type { LessonEditorData, ManagedResource, PublicationStatus } from "../types";

export function LessonEditorPage({ data }: { data: LessonEditorData }) {
  const { lesson, resources } = data;
  const save = useAction();
  const [draft, setDraft] = useState(lesson.content ?? "");
  const [adding, setAdding] = useState(false);
  const order = useAction();
  const shownResources = optimisticOrder(resources, order.formData);
  const ids = shownResources.map((resource) => resource.id);
  const flip = useFlip<HTMLUListElement>();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link to={`/manage/courses/${lesson.courseId}?tab=content`} />}
        >
          <ArrowLeft data-icon="inline-start" />
          {lesson.courseName}
        </Button>
      </div>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={lesson.status} />
          <Badge variant="outline">{lesson.moduleTitle}</Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {lesson.title}
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Isi lesson</CardTitle>
          <CardDescription>Pratinjau di sebelah kanan sama dengan yang dilihat siswa.</CardDescription>
        </CardHeader>
        <CardContent>
          <save.fetcher.Form
            method="post"
            key={`${lesson.title}|${lesson.status}`}
            className="flex flex-col gap-5"
          >
            <input type="hidden" name="intent" value="lesson-update" />
            <ActionError error={save.error} />
            <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
              <Field>
                <FieldLabel htmlFor="lesson-title">Judul</FieldLabel>
                <Input id="lesson-title" name="title" required maxLength={160} defaultValue={lesson.title} />
              </Field>
              <Field>
                <FieldLabel htmlFor="lesson-status">Status</FieldLabel>
                <NativeSelect id="lesson-status" name="status" defaultValue={lesson.status}>
                  {(["draft", "published", "archived"] as PublicationStatus[]).map((value) => (
                    <option key={value} value={value}>
                      {publicationStatusLabel[value]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="lesson-content">Konten</FieldLabel>
                <Textarea
                  id="lesson-content"
                  name="content"
                  rows={16}
                  maxLength={50_000}
                  className="font-mono text-sm"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <FieldDescription>
                  Tulis teks biasa. Rumus: \( x^2 \) di dalam baris atau \[ x^2 \] sebagai blok.
                </FieldDescription>
              </Field>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Pratinjau</p>
                <div
                  data-testid="lesson-preview"
                  className="min-h-48 flex-1 rounded-lg border bg-muted/30 p-4 text-sm/relaxed"
                >
                  {draft.trim() ? (
                    <MathText>{draft}</MathText>
                  ) : (
                    <span className="text-muted-foreground">Belum ada konten.</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={save.pending}>
                Simpan lesson
              </Button>
            </div>
          </save.fetcher.Form>
        </CardContent>
      </Card>

      <section aria-labelledby="resources-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="resources-title" className="font-heading text-2xl font-semibold tracking-tight">
              Resource pendukung
            </h2>
            <p className="text-sm text-muted-foreground">
              Catatan, tautan, atau file PDF yang muncul di bawah lesson.
            </p>
          </div>
          {!adding ? (
            <Button type="button" onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" />
              Tambah resource
            </Button>
          ) : null}
        </div>

        {adding ? (
          <Card className="enter-up">
            <CardContent>
              <ResourceForm lessonId={lesson.id} onDone={() => setAdding(false)} />
            </CardContent>
          </Card>
        ) : null}

        <ActionError error={order.error} />
        {resources.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada resource.
          </p>
        ) : (
          <ul ref={flip.ref} className="flex flex-col gap-3" aria-label="Daftar resource">
            {shownResources.map((resource, index) => (
              <ResourceRow
                key={resource.id}
                index={index}
                lessonId={lesson.id}
                resource={resource}
                orderControls={
                  <ReorderControls
                    ids={ids}
                    index={index}
                    label={`resource ${resource.title}`}
                    onChange={(next) => {
                      flip.capture();
                      order.submit({
                        intent: "resource-order",
                        lessonId: lesson.id,
                        ids: JSON.stringify(next),
                      });
                    }}
                  />
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ResourceRow({
  lessonId,
  resource,
  index,
  orderControls,
}: {
  lessonId: string;
  resource: ManagedResource;
  index: number;
  orderControls: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const remove = useAction();
  const Icon = resource.type === "text" ? FileText : Link2;

  return (
    <ListItem flipKey={resource.id} index={index}>
      <Card data-testid="resource-row">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {orderControls}
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{resource.title}</span>
              <span className="truncate text-xs text-muted-foreground">
                {resource.type === "text"
                  ? "Teks"
                  : resource.type === "file"
                    ? "File — "
                    : "Tautan — "}
                {resource.url ? (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-4"
                  >
                    {resource.url}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : null}
              </span>
            </div>
            <Button type="button" size="xs" variant="ghost" onClick={() => setEditing((value) => !value)}>
              <Pencil /> {editing ? "Tutup" : "Ubah"}
            </Button>
            <ConfirmAction
              label="Hapus"
              size="xs"
              variant="ghost"
              icon={<Trash2 />}
              title="Hapus resource ini?"
              description={`"${resource.title}" akan dihapus dari lesson dan tidak bisa dikembalikan.`}
              confirmLabel="Hapus"
              disabled={remove.pending}
              onConfirm={() =>
                remove.submit({ intent: "resource-delete", resourceId: resource.id })
              }
            />
          </div>
          <ActionError error={remove.error} />
          {resource.type === "text" && resource.content ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              <MathText>{resource.content}</MathText>
            </p>
          ) : null}
          {editing ? (
            <div className="enter-up rounded-lg border bg-muted/30 p-4">
              <ResourceForm lessonId={lessonId} resource={resource} onDone={() => setEditing(false)} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </ListItem>
  );
}

import { Copy, Lock, Plus, X } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "~/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { ActionError, useAction } from "../components/action-feedback";
import { StatusBadge } from "../components/status-badge";
import { isoToLocal } from "../lib/form";
import type { AssignmentEditorData, WorkStatus } from "../types";

export function AssignmentEditorPage({ data }: { data: AssignmentEditorData }) {
  const { assignment, criteria, submissionCount, locked, editable, readiness } = data;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        crumbs={[
          { label: "Kelola course", to: "/manage" },
          { label: "Isi course", to: `/manage/courses/${assignment.courseId}?tab=assignments` },
        ]}
        eyebrow={
          <>
            <StatusBadge status={assignment.status} />
            <Badge variant="lavender">Assignment</Badge>
          </>
        }
        title={assignment.title}
        meta={
          <>
            <span>Skenario: {assignment.scenarioTitle}</span>
            <span className="tabular-nums">{submissionCount} pengerjaan</span>
          </>
        }
        actions={
          <AssignmentStatusActions
            status={assignment.status}
            submissionCount={submissionCount}
            ready={readiness.ready}
          />
        }
      />

      {locked ? (
        <Alert data-testid="assignment-locked">
          <Lock />
          <AlertTitle>Assignment ini sudah dikerjakan {submissionCount} siswa</AlertTitle>
          <AlertDescription>
            Instruksi dan rubrik dikunci agar penilaian tetap adil. Judul dan jadwal masih bisa
            diubah. Perlu versi baru? Salin assignment ini lalu ubah salinannya.
          </AlertDescription>
        </Alert>
      ) : assignment.status !== "draft" ? (
        <Alert>
          <AlertTitle>Assignment sudah diterbitkan</AlertTitle>
          <AlertDescription>
            Kembalikan ke draf untuk mengubah instruksi atau rubrik. Selama belum ada siswa yang
            mengerjakan, ini aman.
          </AlertDescription>
        </Alert>
      ) : null}

      <AssignmentSettingsCard data={data} />
      <RubricCard criteria={criteria} editable={editable} />
    </div>
  );
}

function AssignmentStatusActions({
  status,
  submissionCount,
  ready,
}: {
  status: WorkStatus;
  submissionCount: number;
  ready: boolean;
}) {
  const { pending, error, submit } = useAction();
  const copy = useAction();
  const change = (next: WorkStatus) => submit({ intent: "assignment-status", status: next });
  const canDraft = submissionCount === 0;

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap gap-2 md:justify-end">
        {status === "draft" ? (
          <Button type="button" loading={pending} disabled={!ready} onClick={() => change("published")}>
            Terbitkan assignment
          </Button>
        ) : null}
        {status === "published" ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => change("closed")}>
            Tutup assignment
          </Button>
        ) : null}
        {status === "closed" ? (
          <Button type="button" disabled={pending} onClick={() => change("published")}>
            Buka lagi
          </Button>
        ) : null}
        {(status === "published" || status === "closed") && canDraft ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => change("draft")}>
            Kembali ke draf
          </Button>
        ) : null}
        {status === "archived" ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => change(canDraft ? "draft" : "closed")}>
            Pulihkan
          </Button>
        ) : (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => change("archived")}>
            Arsipkan
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          loading={copy.pending}
          onClick={() => copy.submit({ intent: "assignment-duplicate" })}
        >
          <Copy data-icon="inline-start" />
          Salin assignment
        </Button>
      </div>
      {status === "draft" && !ready ? (
        <p className="text-xs text-muted-foreground">Tambahkan minimal satu kriteria rubrik untuk menerbitkan.</p>
      ) : null}
      <ActionError error={error ?? copy.error} />
    </div>
  );
}

function AssignmentSettingsCard({ data }: { data: AssignmentEditorData }) {
  const { assignment, editable } = data;
  const { fetcher, pending, error } = useAction();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan</CardTitle>
        <CardDescription>
          Assignment berjalan lima tahap: upaya mandiri, tanya AI Tutor, evaluasi jawaban AI, revisi,
          lalu refleksi. Waktu ditampilkan dalam zona waktu perangkatmu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <fetcher.Form
          method="post"
          key={`${assignment.title}|${assignment.instructions}|${assignment.availableAt}|${assignment.dueAt}|${assignment.closesAt}`}
          className="flex flex-col gap-5"
        >
          <input type="hidden" name="intent" value="assignment-update" />
          <ActionError error={error} />
          <Field>
            <FieldLabel htmlFor="assignment-title">Judul</FieldLabel>
            <Input id="assignment-title" name="title" required maxLength={160} defaultValue={assignment.title} />
          </Field>
          <Field>
            <FieldLabel htmlFor="assignment-instructions">Instruksi untuk siswa</FieldLabel>
            <Textarea
              id="assignment-instructions"
              name="instructions"
              required
              rows={8}
              maxLength={10_000}
              // A disabled field is left out of the submission, so a locked
              // assignment can still save its title and schedule.
              disabled={!editable}
              defaultValue={assignment.instructions}
            />
            {!editable ? (
              <FieldDescription>Hanya bisa diubah saat assignment berstatus draf dan belum dikerjakan.</FieldDescription>
            ) : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="assignment-available">Mulai tersedia</FieldLabel>
              <Input id="assignment-available" name="availableAt" type="datetime-local" defaultValue={isoToLocal(assignment.availableAt)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="assignment-due">Tenggat</FieldLabel>
              <Input id="assignment-due" name="dueAt" type="datetime-local" defaultValue={isoToLocal(assignment.dueAt)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="assignment-closes">Ditutup otomatis</FieldLabel>
              <Input id="assignment-closes" name="closesAt" type="datetime-local" defaultValue={isoToLocal(assignment.closesAt)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Simpan pengaturan
            </Button>
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

type Row = { label: string; description: string; maxPoints: string };

function RubricCard({
  criteria,
  editable,
}: {
  criteria: AssignmentEditorData["criteria"];
  editable: boolean;
}) {
  const { fetcher, pending, error } = useAction();
  const initial = criteria.map((criterion) => ({
    label: criterion.label,
    description: criterion.description,
    maxPoints: String(criterion.maxPoints),
  }));
  // Re-seed from the server after every save.
  const seed = JSON.stringify(initial);
  const [state, setState] = useState<{ seed: string; rows: Row[] }>({ seed, rows: initial });
  if (state.seed !== seed) setState({ seed, rows: initial });
  const rows = state.rows;
  const setRows = (next: Row[]) => setState({ seed: state.seed, rows: next });
  const [localError, setLocalError] = useState<string | null>(null);
  const total = rows.reduce((sum, row) => sum + (Number(row.maxPoints) || 0), 0);

  function save(event: React.FormEvent) {
    event.preventDefault();
    for (const row of rows) {
      if (!row.label.trim() || !row.description.trim()) {
        setLocalError("Nama dan deskripsi setiap kriteria wajib diisi.");
        return;
      }
      const points = Number(row.maxPoints);
      if (!(points > 0 && points <= 100)) {
        setLocalError("Poin setiap kriteria harus lebih dari 0 dan paling banyak 100.");
        return;
      }
    }
    setLocalError(null);
    fetcher.submit(
      {
        intent: "criteria-save",
        payload: JSON.stringify(
          rows.map((row) => ({
            label: row.label.trim(),
            description: row.description.trim(),
            maxPoints: Number(row.maxPoints),
          })),
        ),
      },
      { method: "post" },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rubrik penilaian</CardTitle>
        <CardDescription>
          Disalin dari skenario; perubahan di sini hanya berlaku untuk assignment ini. Total saat ini{" "}
          <span data-testid="rubric-total" className="font-medium text-foreground">{total} poin</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-4" noValidate>
          <ActionError error={localError ?? error} />
          <ul className="flex flex-col gap-3" aria-label="Kriteria rubrik">
            {rows.map((row, index) => (
              <li
                key={index}
                data-testid="criterion-row"
                className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_2fr_6rem_auto]"
              >
                <Input
                  aria-label={`Nama kriteria ${index + 1}`}
                  value={row.label}
                  disabled={!editable}
                  maxLength={120}
                  placeholder="Nama kriteria"
                  onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))}
                />
                <Input
                  aria-label={`Deskripsi kriteria ${index + 1}`}
                  value={row.description}
                  disabled={!editable}
                  maxLength={1000}
                  placeholder="Apa yang dinilai"
                  onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)))}
                />
                <Input
                  aria-label={`Poin kriteria ${index + 1}`}
                  type="number"
                  min={1}
                  max={100}
                  value={row.maxPoints}
                  disabled={!editable}
                  onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, maxPoints: event.target.value } : item)))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Hapus kriteria ${index + 1}`}
                  disabled={!editable}
                  onClick={() => setRows(rows.filter((_, i) => i !== index))}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada kriteria.</p>
          ) : null}
          {editable ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={rows.length >= 20}
                onClick={() => setRows([...rows, { label: "", description: "", maxPoints: "10" }])}
              >
                <Plus data-icon="inline-start" />
                Tambah kriteria
              </Button>
              <Button type="submit" loading={pending}>
                Simpan rubrik
              </Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

import { ChartBar, Copy, Lock, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { ActionError, useAction } from "../components/action-feedback";
import { EditorSection, SaveBar, useFormPart, type SavePart } from "../components/editor-kit";
import { StatusMenu, workChoices } from "../components/status-menu";
import { isoToLocal } from "../lib/form";
import type { AssignmentEditorData, WorkStatus } from "../types";

type Row = { label: string; description: string; maxPoints: string };

export function AssignmentEditorPage({ data }: { data: AssignmentEditorData }) {
  const { assignment, criteria, submissionCount, locked, editable, readiness } = data;
  const status = useAction();
  const copy = useAction();
  const settings = useAction();
  const settingsForm = useRef<HTMLFormElement>(null);
  const version = `${assignment.title}|${assignment.instructions}|${assignment.availableAt}|${assignment.dueAt}|${assignment.closesAt}`;
  const settingsPart = useFormPart(settingsForm, version);
  const rubric = useRubric(criteria);
  const changeStatus = (next: WorkStatus) => status.submit({ intent: "assignment-status", status: next });

  return (
    <div className="flex flex-col gap-8 pb-24">
      <PageHeader
        crumbs={[
          { label: "Kelola course", to: "/manage" },
          { label: assignment.courseName, to: `/manage/courses/${assignment.courseId}?tab=assignments` },
        ]}
        eyebrow={
          <>
            <StatusMenu
              status={assignment.status}
              noun="assignment"
              pending={status.pending}
              choices={workChoices(assignment.status, { ready: readiness.ready, canDraft: submissionCount === 0 })}
              onChange={changeStatus}
            />
            <Badge variant="outline">Assignment</Badge>
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
          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="flex flex-wrap gap-2 md:justify-end">
              {assignment.status === "draft" ? (
                <Button
                  type="button"
                  variant="mint"
                  size="touch"
                  loading={status.pending}
                  disabled={!readiness.ready}
                  onClick={() => changeStatus("published")}
                >
                  Terbitkan assignment
                </Button>
              ) : (
                <Button variant="outline" size="touch" render={<Link to={`/manage/assignments/${assignment.id}/analytics`} />}>
                  <ChartBar data-icon="inline-start" />
                  Analitik kelas
                </Button>
              )}
              <Button type="button" variant="ghost" size="touch" loading={copy.pending} onClick={() => copy.submit({ intent: "assignment-duplicate" })}>
                <Copy data-icon="inline-start" />
                Salin
              </Button>
            </div>
            {assignment.status === "draft" && !readiness.ready ? (
              <p className="text-xs text-muted-foreground">Tambahkan minimal satu kriteria rubrik untuk menerbitkan.</p>
            ) : null}
            <ActionError error={status.error ?? copy.error} />
          </div>
        }
      />

      {locked ? (
        <Alert variant="note" data-testid="assignment-locked">
          <Lock />
          <AlertTitle>Assignment ini sudah dikerjakan {submissionCount} siswa</AlertTitle>
          <AlertDescription>
            Instruksi dan rubrik dikunci agar penilaian tetap adil. Judul dan jadwal masih bisa
            diubah. Perlu versi baru? Salin assignment ini lalu ubah salinannya.
          </AlertDescription>
        </Alert>
      ) : assignment.status !== "draft" ? (
        <Alert variant="note">
          <AlertTitle>Assignment sudah diterbitkan</AlertTitle>
          <AlertDescription>
            Kembalikan ke draf lewat status di atas untuk mengubah instruksi atau rubrik. Selama belum ada siswa yang
            mengerjakan, ini aman.
          </AlertDescription>
        </Alert>
      ) : null}

      <EditorSection
        id="assignment-settings-title"
        title="Pengaturan"
        description="Lima tahap: upaya mandiri, tanya AI Tutor, evaluasi jawaban AI, revisi, lalu refleksi. Waktu ditampilkan dalam zona waktu perangkatmu."
      >
        <settings.fetcher.Form ref={settingsForm} method="post" key={version} className="flex flex-col gap-5">
          <input type="hidden" name="intent" value="assignment-update" />
          <ActionError error={settings.error} />
          <Field>
            <FieldLabel htmlFor="assignment-title" className="font-semibold">Judul</FieldLabel>
            <Input id="assignment-title" name="title" variant="soft" required maxLength={160} defaultValue={assignment.title} />
          </Field>
          <Field>
            <FieldLabel htmlFor="assignment-instructions" className="font-semibold">Instruksi untuk siswa</FieldLabel>
            <Textarea
              id="assignment-instructions"
              name="instructions"
              variant="soft"
              required
              rows={8}
              maxLength={10_000}
              // A disabled field is left out of the submission, so a locked
              // assignment can still save its title and schedule.
              disabled={!editable}
              defaultValue={assignment.instructions}
              className="min-h-48"
            />
            {!editable ? (
              <FieldDescription>Hanya bisa diubah saat assignment berstatus draf dan belum dikerjakan.</FieldDescription>
            ) : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="assignment-available" className="font-semibold">Mulai tersedia</FieldLabel>
              <Input id="assignment-available" name="availableAt" variant="soft" type="datetime-local" defaultValue={isoToLocal(assignment.availableAt)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="assignment-due" className="font-semibold">Tenggat</FieldLabel>
              <Input id="assignment-due" name="dueAt" variant="soft" type="datetime-local" defaultValue={isoToLocal(assignment.dueAt)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="assignment-closes" className="font-semibold">Ditutup otomatis</FieldLabel>
              <Input id="assignment-closes" name="closesAt" variant="soft" type="datetime-local" defaultValue={isoToLocal(assignment.closesAt)} />
            </Field>
          </div>
        </settings.fetcher.Form>
      </EditorSection>

      <EditorSection
        id="rubric-title"
        title="Rubrik penilaian"
        description={
          <>
            Disalin dari skenario; perubahan di sini hanya berlaku untuk assignment ini. Total{" "}
            <span data-testid="rubric-total" className="font-medium text-foreground">{rubric.total} poin</span>.
          </>
        }
        action={
          editable ? (
            <Button type="button" variant="outline" size="tap" disabled={rubric.rows.length >= 20} onClick={rubric.add}>
              <Plus data-icon="inline-start" />
              Tambah kriteria
            </Button>
          ) : null
        }
      >
        <ActionError error={rubric.error} />
        {rubric.rows.length === 0 ? (
          <p className="rounded-3xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada kriteria.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl ring-1 ring-border" aria-label="Kriteria rubrik">
            {rubric.rows.map((row, index) => (
              <li
                key={index}
                data-testid="criterion-row"
                className="grid items-center gap-2 bg-background p-3 sm:grid-cols-[1fr_2fr_6rem_auto] sm:px-4"
              >
                <Input
                  aria-label={`Nama kriteria ${index + 1}`}
                  value={row.label}
                  disabled={!editable}
                  maxLength={120}
                  placeholder="Nama kriteria"
                  className="h-11 font-medium"
                  onChange={(event) => rubric.edit(index, { label: event.target.value })}
                />
                <Input
                  aria-label={`Deskripsi kriteria ${index + 1}`}
                  value={row.description}
                  disabled={!editable}
                  maxLength={1000}
                  placeholder="Apa yang dinilai"
                  className="h-11"
                  onChange={(event) => rubric.edit(index, { description: event.target.value })}
                />
                <Input
                  aria-label={`Poin kriteria ${index + 1}`}
                  type="number"
                  min={1}
                  max={100}
                  value={row.maxPoints}
                  disabled={!editable}
                  className="h-11 tabular-nums"
                  onChange={(event) => rubric.edit(index, { maxPoints: event.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-tap"
                  aria-label={`Hapus kriteria ${index + 1}`}
                  disabled={!editable}
                  onClick={() => rubric.remove(index)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </EditorSection>

      <SaveBar
        parts={[settingsPart, rubric.part]}
        pending={settings.pending || rubric.pending}
        error={settings.error ?? rubric.error}
      />
    </div>
  );
}

/** The rubric's rows as local state, re-seeded from the server after every save, saved through the save bar. */
function useRubric(criteria: AssignmentEditorData["criteria"]) {
  const { fetcher, pending, error } = useAction();
  const initial: Row[] = criteria.map((criterion) => ({
    label: criterion.label,
    description: criterion.description,
    maxPoints: String(criterion.maxPoints),
  }));
  const seed = JSON.stringify(initial);
  const [state, setState] = useState<{ seed: string; rows: Row[] }>({ seed, rows: initial });
  if (state.seed !== seed) setState({ seed, rows: initial });
  const rows = state.rows;
  const setRows = (next: Row[]) => setState({ seed: state.seed, rows: next });
  const [localError, setLocalError] = useState<string | null>(null);

  function save() {
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
          rows.map((row) => ({ label: row.label.trim(), description: row.description.trim(), maxPoints: Number(row.maxPoints) })),
        ),
      },
      { method: "post" },
    );
  }

  const part: SavePart = {
    dirty: JSON.stringify(rows) !== seed,
    save,
    discard: () => {
      setLocalError(null);
      setState({ seed, rows: initial });
    },
  };
  return {
    rows,
    total: rows.reduce((sum, row) => sum + (Number(row.maxPoints) || 0), 0),
    pending,
    error: localError ?? error,
    part,
    add: () => setRows([...rows, { label: "", description: "", maxPoints: "10" }]),
    edit: (index: number, patch: Partial<Row>) => setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row))),
    remove: (index: number) => setRows(rows.filter((_, i) => i !== index)),
  };
}

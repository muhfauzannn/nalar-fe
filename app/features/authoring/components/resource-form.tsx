import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import type { ManagedResource, ResourceType } from "../types";
import { ActionError, useAction, useOnSuccess } from "./action-feedback";
import { NativeSelect } from "./native-select";

const TYPE_LABEL: Record<ResourceType, string> = {
  text: "Teks / catatan",
  link: "Tautan web",
  file: "File (PDF atau dokumen)",
};

// Create and edit share one form. `resource` present = edit.
export function ResourceForm({
  lessonId,
  resource,
  onDone,
}: {
  lessonId: string;
  resource?: ManagedResource;
  onDone?: () => void;
}) {
  const { fetcher, pending, error } = useAction();
  const [type, setType] = useState<ResourceType>(resource?.type ?? "link");
  const idPrefix = resource ? `resource-${resource.id}` : "new-resource";
  useOnSuccess(fetcher, () => onDone?.());

  return (
    <fetcher.Form method="post" className="flex flex-col gap-4">
      <input type="hidden" name="intent" value={resource ? "resource-update" : "resource-create"} />
      <input type="hidden" name="lessonId" value={lessonId} />
      {resource ? <input type="hidden" name="resourceId" value={resource.id} /> : null}
      <ActionError error={error} />

      <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-type`}>Jenis</FieldLabel>
          <NativeSelect
            id={`${idPrefix}-type`}
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as ResourceType)}
          >
            {(Object.keys(TYPE_LABEL) as ResourceType[]).map((value) => (
              <option key={value} value={value}>
                {TYPE_LABEL[value]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-title`}>Judul</FieldLabel>
          <Input
            id={`${idPrefix}-title`}
            name="title"
            required
            maxLength={160}
            defaultValue={resource?.title ?? ""}
            placeholder={type === "file" ? "mis. Modul Bab 1 (PDF)" : "mis. Bacaan tambahan"}
          />
        </Field>
      </div>

      {type === "text" ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-content`}>Isi</FieldLabel>
          <Textarea
            id={`${idPrefix}-content`}
            name="content"
            required
            rows={5}
            maxLength={10_000}
            defaultValue={resource?.content ?? ""}
          />
          <FieldDescription>Rumus bisa ditulis dengan \( ... \) atau $...$.</FieldDescription>
        </Field>
      ) : (
        <>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-url`}>URL</FieldLabel>
            <Input
              id={`${idPrefix}-url`}
              name="url"
              type="url"
              required
              maxLength={2048}
              defaultValue={resource?.url ?? ""}
              placeholder="https://..."
            />
            <FieldDescription>
              {type === "file"
                ? "NALAR tidak menyimpan file. Unggah PDF ke penyimpanan yang bisa dibuka siapa saja yang punya tautan (Google Drive, Dropbox, dll.), lalu tempel tautannya di sini. Hanya http:// dan https:// yang diterima."
                : "Hanya tautan http:// dan https:// yang diterima."}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-description`}>Keterangan (opsional)</FieldLabel>
            <Input
              id={`${idPrefix}-description`}
              name="content"
              maxLength={1000}
              defaultValue={resource?.content ?? ""}
              placeholder="mis. Baca halaman 3–10"
            />
          </Field>
        </>
      )}

      <div className="flex justify-end gap-2">
        {onDone ? (
          <Button type="button" variant="outline" size="sm" onClick={onDone}>
            Batal
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {resource ? "Simpan resource" : "Tambah resource"}
        </Button>
      </div>
    </fetcher.Form>
  );
}

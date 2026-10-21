import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { formatFileSize, manageResourceFileUrl, MAX_PDF_BYTES } from "~/lib/files";
import type { ManagedResource, ResourceType } from "../types";
import { ActionError, useAction, useOnSuccess } from "./action-feedback";
import { NativeSelect } from "./native-select";

const TYPE_LABEL: Record<ResourceType, string> = {
  text: "Teks / catatan",
  link: "Tautan web",
  file: "File PDF (unggah)",
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
  // An uploaded PDF keeps its type (changing it would silently delete the file); an old
  // URL-only 'file' resource can still be edited by URL or switched to an upload.
  const uploaded = resource?.file ?? null;
  const legacyFile = resource?.type === "file" && !uploaded;
  const idPrefix = resource ? `resource-${resource.id}` : "new-resource";
  useOnSuccess(fetcher, () => onDone?.());

  return (
    <fetcher.Form method="post" encType="multipart/form-data" className="flex flex-col gap-4">
      <input type="hidden" name="intent" value={resource ? "resource-update" : "resource-create"} />
      <input type="hidden" name="lessonId" value={lessonId} />
      {resource ? <input type="hidden" name="resourceId" value={resource.id} /> : null}
      <ActionError error={error} />

      <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-type`}>Jenis</FieldLabel>
          <NativeSelect
            id={`${idPrefix}-type`}
            // a disabled control is not submitted, so an uploaded resource sends its type below
            name={uploaded ? undefined : "type"}
            value={type}
            disabled={Boolean(uploaded)}
            onChange={(event) => setType(event.target.value as ResourceType)}
          >
            {(Object.keys(TYPE_LABEL) as ResourceType[]).map((value) => (
              <option key={value} value={value}>
                {TYPE_LABEL[value]}
              </option>
            ))}
          </NativeSelect>
          {uploaded ? <input type="hidden" name="type" value="file" /> : null}
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
          {type === "file" ? (
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-file`}>
                {uploaded || legacyFile ? "Ganti dengan file baru (opsional)" : "File PDF"}
              </FieldLabel>
              {uploaded ? (
                <p className="text-sm text-muted-foreground">
                  File saat ini:{" "}
                  <a
                    href={manageResourceFileUrl(resource!.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    {uploaded.name}
                  </a>{" "}
                  ({formatFileSize(uploaded.size)})
                </p>
              ) : null}
              <Input
                id={`${idPrefix}-file`}
                name="file"
                type="file"
                accept="application/pdf,.pdf"
                required={!uploaded && !legacyFile}
              />
              <FieldDescription>
                PDF, maksimal {formatFileSize(MAX_PDF_BYTES)}. Hanya siswa yang terdaftar di
                course ini yang bisa membukanya.
              </FieldDescription>
            </Field>
          ) : null}
          {type === "link" || legacyFile ? (
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-url`}>
                {legacyFile ? "Atau tetap pakai URL" : "URL"}
              </FieldLabel>
              <Input
                id={`${idPrefix}-url`}
                name="url"
                type="url"
                required={!legacyFile}
                maxLength={2048}
                defaultValue={resource?.url ?? ""}
                placeholder="https://..."
              />
              <FieldDescription>
                {legacyFile
                  ? "Resource ini masih berupa tautan ke file di luar NALAR. Pilih file di atas untuk menggantinya dengan unggahan."
                  : "Hanya tautan http:// dan https:// yang diterima."}
              </FieldDescription>
            </Field>
          ) : null}
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
        <Button type="submit" size="sm" loading={pending}>
          {resource ? "Simpan resource" : "Tambah resource"}
        </Button>
      </div>
    </fetcher.Form>
  );
}

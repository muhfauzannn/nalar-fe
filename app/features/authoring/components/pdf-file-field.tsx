import { Upload } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { formatFileSize, MAX_PDF_BYTES, pdfProblem } from "~/lib/files";
import { cn } from "~/lib/utils";

export function PdfFileField({
  id,
  label,
  required,
  disabled,
  children,
}: {
  id: string;
  label: string;
  required: boolean;
  disabled: boolean;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectFiles(files: FileList | null) {
    const input = inputRef.current;
    if (!input) return;
    const next = files?.item(0) ?? null;
    const problem = files && files.length > 1
      ? "Pilih satu file PDF saja."
      : next ? pdfProblem(next) : null;

    input.setCustomValidity(problem ?? "");
    setError(problem);
    setFile(problem ? null : next);
    if (problem || !next) {
      input.value = "";
    } else {
      // Keep the native input in sync so multipart submission includes dropped files.
      const transfer = new DataTransfer();
      transfer.items.add(next);
      input.files = transfer.files;
    }
  }

  return (
    <Field data-invalid={Boolean(error)} data-disabled={disabled}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-dashed border-input p-4 transition-colors",
          dragging && !disabled && "border-primary bg-primary/5",
          error && "border-destructive",
          disabled && "opacity-50",
        )}
        onDragEnter={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          dragDepth.current += 1;
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          if (!disabled && event.dataTransfer.files.length) {
            selectFiles(event.dataTransfer.files);
          }
        }}
      >
        <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-sm">
          <Upload className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>{dragging ? "Lepaskan PDF di sini" : "Tarik dan lepas PDF di sini, atau klik untuk memilih file."}</span>
        </label>
        <Input
          ref={inputRef}
          id={id}
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-description${error ? ` ${id}-error` : ""}`}
          onChange={(event) => selectFiles(event.currentTarget.files)}
        />
        <p role="status" className="break-all text-sm text-muted-foreground">
          {file ? `${file.name} (${formatFileSize(file.size)})` : "Belum ada file dipilih."}
        </p>
      </div>
      <FieldDescription id={`${id}-description`}>
        PDF, maksimal {formatFileSize(MAX_PDF_BYTES)}. Hanya siswa yang terdaftar di
        course ini yang bisa membukanya.
      </FieldDescription>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}

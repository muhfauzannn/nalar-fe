import { ChevronDown } from "lucide-react";

import { cn } from "~/lib/utils";
import type { PublicationStatus, WorkStatus } from "../types";

// The status of anything a teacher publishes (course, module, lesson, quiz, assignment) as one control:
// it reads like a badge and changes like a select, instead of a badge plus buttons beside it. Every
// editor uses it, so changing a status works the same everywhere.
const look: Record<WorkStatus, { pill: string; dot: string; label: string }> = {
  draft: { pill: "bg-brand-amber-soft text-brand-amber-foreground", dot: "bg-brand-amber", label: "Draf" },
  published: { pill: "bg-brand-mint-soft text-brand-mint-foreground", dot: "bg-brand-mint", label: "Terbit" },
  closed: { pill: "bg-secondary text-secondary-foreground", dot: "bg-secondary-foreground/60", label: "Ditutup" },
  archived: { pill: "bg-brand-lavender-soft text-brand-lavender-foreground", dot: "bg-brand-lavender-foreground/50", label: "Arsip" },
};

export type StatusChoice<S extends WorkStatus> = { value: S; label: string; disabled?: boolean };

/** Modules and lessons: draft and published swap, anything can be archived, an archive comes back as a draft. */
export function publicationChoices(status: PublicationStatus): StatusChoice<PublicationStatus>[] {
  return status === "archived"
    ? [{ value: "archived", label: "Arsip" }, { value: "draft", label: "Pulihkan ke draf" }]
    : [
        { value: "draft", label: "Draf" },
        { value: "published", label: "Terbit" },
        { value: "archived", label: "Arsipkan" },
      ];
}

/**
 * Quizzes and assignments: publishing needs them ready, a live one can be closed and opened again, and it
 * only goes back to draft (or out of the archive as a draft) while no student has worked on it.
 */
export function workChoices(status: WorkStatus, { ready, canDraft }: { ready: boolean; canDraft: boolean }): StatusChoice<WorkStatus>[] {
  const draft = { value: "draft" as const, label: status === "draft" ? "Draf" : "Kembali ke draf", disabled: !canDraft };
  switch (status) {
    case "draft":
      return [draft, { value: "published", label: "Terbitkan", disabled: !ready }, { value: "archived", label: "Arsipkan" }];
    case "published":
      return [{ value: "published", label: "Terbit" }, { value: "closed", label: "Tutup" }, draft, { value: "archived", label: "Arsipkan" }];
    case "closed":
      return [{ value: "closed", label: "Ditutup" }, { value: "published", label: "Buka lagi" }, draft, { value: "archived", label: "Arsipkan" }];
    case "archived":
      return [{ value: "archived", label: "Arsip" }, canDraft ? { value: "draft", label: "Pulihkan ke draf" } : { value: "closed", label: "Pulihkan" }];
  }
}

export function StatusMenu<S extends WorkStatus>({
  status,
  noun,
  pending = false,
  choices,
  onChange,
  name,
  form,
  size = "sm",
}: {
  status: S;
  /** "modul Bab 1", for the control's name. */
  noun: string;
  pending?: boolean;
  choices: StatusChoice<S>[];
  onChange: (next: S) => void;
  /** Set to post the status with a form instead of on change. */
  name?: string;
  form?: string;
  size?: "sm" | "md";
}) {
  const { pill, dot, label } = look[status];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition-colors focus-within:ring-3 focus-within:ring-ring/50",
        size === "sm" ? "h-8 pr-7 pl-2.5 text-xs" : "h-9 pr-8 pl-3 text-sm",
        pill,
        pending && "opacity-60",
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot)} />
      {label}
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 opacity-70" aria-hidden="true" />
      <select
        aria-label={`Status ${noun}`}
        value={status}
        name={name}
        form={form}
        disabled={pending}
        onChange={(event) => onChange(event.target.value as S)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value} disabled={choice.disabled}>
            {choice.label}
          </option>
        ))}
      </select>
    </span>
  );
}

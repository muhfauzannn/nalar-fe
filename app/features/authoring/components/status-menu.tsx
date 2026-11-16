import { ChevronDown } from "lucide-react";

import { cn } from "~/lib/utils";
import { publicationStatusLabel } from "../lib/form";
import type { PublicationStatus } from "../types";

// The status of a module or lesson as one control: it shows the status like a badge and changes it like a
// select, instead of a badge plus two or three buttons beside it. Only the moves the server allows are
// offered: draft and published swap, anything can be archived, and an archive comes back as a draft.
const look: Record<PublicationStatus, string> = {
  draft: "bg-brand-amber-soft text-brand-amber-foreground",
  published: "bg-brand-mint-soft text-brand-mint-foreground",
  archived: "bg-brand-lavender-soft text-brand-lavender-foreground",
};
const dot: Record<PublicationStatus, string> = {
  draft: "bg-brand-amber",
  published: "bg-brand-mint",
  archived: "bg-brand-lavender-foreground/50",
};
const label: Record<PublicationStatus, string> = { ...publicationStatusLabel, archived: "Arsip" };

function choices(status: PublicationStatus): PublicationStatus[] {
  return status === "archived" ? ["archived", "draft"] : ["draft", "published", "archived"];
}

export function StatusMenu({
  status,
  noun,
  pending,
  onChange,
}: {
  status: PublicationStatus;
  /** "modul Bab 1", for the control's name. */
  noun: string;
  pending: boolean;
  onChange: (next: PublicationStatus) => void;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full pr-7 pl-2.5 text-xs font-semibold transition-colors focus-within:ring-3 focus-within:ring-ring/50",
        look[status],
        pending && "opacity-60",
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot[status])} />
      {label[status]}
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 opacity-70" aria-hidden="true" />
      <select
        aria-label={`Status ${noun}`}
        value={status}
        disabled={pending}
        onChange={(event) => onChange(event.target.value as PublicationStatus)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {choices(status).map((value) => (
          <option key={value} value={value}>
            {value === "archived" && status !== "archived" ? "Arsipkan" : value === "draft" && status === "archived" ? "Pulihkan ke draf" : label[value]}
          </option>
        ))}
      </select>
    </span>
  );
}

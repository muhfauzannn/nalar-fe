import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { WorkStatus } from "../types";
import { workStatusLabel } from "../lib/form";

// The dot repeats the colour for people who cannot tell mint from amber: the
// label always carries the meaning.
const look = {
  draft: { variant: "amber", dot: "bg-brand-amber" },
  published: { variant: "mint", dot: "bg-brand-mint" },
  closed: { variant: "secondary", dot: "bg-secondary-foreground/60" },
  archived: { variant: "lavender", dot: "bg-brand-lavender-foreground/50" },
} as const satisfies Record<WorkStatus, { variant: "amber" | "mint" | "secondary" | "lavender"; dot: string }>;

export function StatusBadge({ status }: { status: WorkStatus }) {
  const { variant, dot } = look[status];
  return (
    <Badge variant={variant} className="gap-1.5">
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot)} />
      {workStatusLabel[status]}
    </Badge>
  );
}

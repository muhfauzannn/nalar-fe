import { Badge } from "~/components/ui/badge";
import type { WorkStatus } from "../types";
import { workStatusLabel } from "../lib/form";

const variant = {
  draft: "outline",
  published: "mint",
  closed: "lavender",
  archived: "secondary",
} as const satisfies Record<WorkStatus, "outline" | "mint" | "lavender" | "secondary">;

export function StatusBadge({ status }: { status: WorkStatus }) {
  return <Badge variant={variant[status]}>{workStatusLabel[status]}</Badge>;
}

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import type { WorkStatus } from "../types";
import { ListItem } from "./list-item";
import { StatusBadge } from "./status-badge";

/**
 * A quiz or an assignment on the course editor's tabs: status, title, a line of
 * numbers, and the way into its editor. The title is a stretched link, so the whole
 * row opens it; the button just says so.
 */
export function WorkRow({
  index,
  testId,
  title,
  status,
  meta,
  href,
}: {
  index: number;
  testId: string;
  title: string;
  status: WorkStatus;
  meta: ReactNode;
  href: string;
}) {
  return (
    <ListItem index={index} data-testid={testId} className="relative flex flex-wrap items-center gap-3 bg-background p-3 sm:px-4">
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
        <h3 className="flex flex-wrap items-center gap-2 font-heading text-base leading-snug font-semibold text-pretty wrap-break-word">
          <Link
            to={href}
            className="rounded-sm outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50 hover:underline hover:underline-offset-4"
          >
            {title}
          </Link>
          <StatusBadge status={status} />
        </h3>
        <p className="text-sm text-muted-foreground">{meta}</p>
      </div>
      <Button size="tap" variant="outline" className="relative z-10 max-sm:w-full" render={<Link to={href} />}>
        Buka editor
        <ArrowRight data-icon="inline-end" />
      </Button>
    </ListItem>
  );
}

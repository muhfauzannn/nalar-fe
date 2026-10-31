import { ArrowLeft, RefreshCw, type LucideIcon } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { formatDateTime } from "../lib/format";

/**
 * What a student sees when a quiz or assignment is out of reach: what happened,
 * the few facts that matter (dates, saved work), and the way back. One layout
 * for every reason. Time running out is the only one that reads as a loss, so
 * it is the only one tinted red.
 */
type Tone = "neutral" | "upcoming" | "danger";
export type NoticeFact = { label: string; value: string };
export type Notice = {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  description: string;
  facts?: NoticeFact[];
  hint?: string;
};

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  upcoming: "bg-brand-lavender-soft text-brand-lavender-foreground",
  danger: "bg-destructive/10 text-destructive",
};

export const contactTeacher = "Merasa ini keliru? Hubungi pengajar course.";

export function noticeFacts(...items: Array<NoticeFact | null>) {
  return items.filter((item): item is NoticeFact => item !== null);
}

export function datedFact(label: string, value: string | null): NoticeFact | null {
  return value ? { label, value: formatDateTime(value) } : null;
}

export function AccessNotice({
  notice,
  courseId,
  syncing,
}: {
  notice: Notice;
  courseId: string;
  /** The page is re-reading the item from the server; show this line instead of the hint. */
  syncing?: string;
}) {
  const { tone, icon: Icon, title, description, facts = [], hint } = notice;

  return (
    <Card role="status" className="enter-fade mx-auto w-full max-w-2xl">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-10 sm:py-12">
        <span
          className={cn(
            "enter-pop flex size-14 items-center justify-center rounded-2xl ring-1 ring-foreground/5 ring-inset",
            toneClass[tone],
          )}
          // `.enter-pop` is a shorthand and resets any delay utility, so set it inline.
          style={{ animationDelay: "60ms" }}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-heading text-xl font-semibold tracking-tight text-balance">
          {title}
        </h2>
        <p className="mt-2 max-w-md text-sm/relaxed text-pretty text-muted-foreground">
          {description}
        </p>

        {facts.length > 0 && (
          <dl
            className={cn(
              "mt-6 grid w-full divide-y divide-border overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0",
              facts.length > 1 ? "max-w-md" : "max-w-64",
            )}
          >
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-0.5 px-4 py-3">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {fact.label}
                </dt>
                <dd className="text-sm font-medium tabular-nums">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <Button
          variant="outline"
          className="mt-7"
          render={<Link to={`/courses/${courseId}`} />}
        >
          <ArrowLeft data-icon="inline-start" />
          Kembali ke course
        </Button>

        {syncing ? (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3 animate-spin" aria-hidden="true" />
            {syncing}
          </p>
        ) : hint ? (
          <p className="mt-4 text-xs text-pretty text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

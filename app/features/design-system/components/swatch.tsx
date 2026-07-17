import { cn } from "~/lib/utils";

/** A single color token preview: a filled chip + its token name. */
export function Swatch({
  name,
  className,
  hint,
}: {
  name: string;
  className: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("h-16 w-full rounded-lg ring-1 ring-border/60", className)} />
      <div className="flex flex-col">
        <span className="text-xs font-medium">{name}</span>
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}

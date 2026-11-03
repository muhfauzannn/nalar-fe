/** One number of a class summary, with an optional line under it. */
export function StatTile({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

import { PageHeader } from "~/components/layout/page-header";
import { cn } from "~/lib/utils";
import { badgeCopy, pointCopy } from "../lib/game";
import type { PointsData } from "../types";

// The canvas "Koleksi lencana". Every badge is a milestone of process
// behaviour (Poin Nalar), never of a score or the AI Offloading Index.
export function BadgesPage({ data }: { data: PointsData }) {
  const earned = data.badges.filter((badge) => badge.earned);
  const featured = earned.at(-1) ?? null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Lencana"
        description={`${earned.length} dari ${data.badges.length} terkumpul. Lencana datang dari cara kerjamu, bukan dari nilai.`}
      />

      {featured && (
        <section className="flex items-center gap-5 rounded-[1.75rem] bg-[#18153a] p-5 text-white sm:gap-7 sm:p-7">
          <img
            src={badgeCopy[featured.id].image}
            alt=""
            width={192}
            height={200}
            className="size-24 shrink-0 drop-shadow-[0_8px_18px_rgba(75,210,159,0.35)] sm:size-32"
          />
          <div className="min-w-0">
            <p className="text-sm text-[#c6c1f1]">Lencana terbaru</p>
            <h2 className="mt-0.5 font-heading text-2xl font-bold sm:text-3xl">{badgeCopy[featured.id].title}</h2>
            <p className="mt-1 text-sm text-[#c6c1f1]">{badgeCopy[featured.id].detail}</p>
          </div>
        </section>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {data.badges.map((badge) => {
          const copy = badgeCopy[badge.id];
          return (
            <li
              key={badge.id}
              className={cn(
                "flex flex-col items-center gap-2 rounded-[1.5rem] p-3.5 text-center shadow-card ring-1 ring-border sm:gap-3 sm:p-5",
                badge.earned ? "bg-card" : "bg-muted/40",
              )}
            >
              <img
                src={copy.image}
                alt=""
                width={192}
                height={200}
                className={cn("size-16 sm:size-24", !badge.earned && "opacity-40 grayscale")}
              />
              <div>
                <p className="font-heading font-semibold">
                  {copy.title}
                  <span className="sr-only">{badge.earned ? ", sudah didapat" : ", belum didapat"}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{copy.detail}</p>
              </div>
              {!badge.earned && (
                <div className="mt-auto w-full">
                  <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-[#4bd29f]"
                      style={{ width: `${(badge.progress / badge.target) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                    {badge.progress} dari {badge.target}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {data.recent.length > 0 && (
        <section aria-labelledby="recent-points" className="flex flex-col gap-3">
          <h2 id="recent-points" className="font-heading text-lg font-semibold">
            Poin terakhir
          </h2>
          <ul className="divide-y rounded-[1.5rem] bg-card px-5 shadow-card ring-1 ring-border">
            {data.recent.map((event) => (
              <li key={event.id} className="flex items-start justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{pointCopy[event.kind].title}</p>
                  <p className="truncate text-xs text-muted-foreground">{event.assignmentTitle}</p>
                </div>
                <span className="shrink-0 font-heading text-sm font-semibold text-brand-mint-foreground tabular-nums">
                  +{event.points}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

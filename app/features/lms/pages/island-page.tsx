import { ArrowRight, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Empty, EmptyHeader, EmptyIllustration, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { cn } from "~/lib/utils";
import { IslandJourney } from "../components/island-journey";
import { formatDateTime } from "../lib/format";
import { badgeCopy, pointCopy, postNames } from "../lib/game";
import type { BadgeProgress, IslandData, PointEvent } from "../types";

type Building = IslandData["buildings"][number];

// The course as an island (PRD §5.9): each assignment is a hall reached through
// the five stages. Poin Nalar and badges reward how the work was done; the
// AI Offloading Index is not here and never feeds them.
export function IslandPage({ data }: { data: IslandData }) {
  const [params, setParams] = useSearchParams();
  const selected =
    data.buildings.find((item) => item.assignmentId === params.get("tugas")) ??
    data.buildings.find((item) => item.submissionStatus === "in_progress") ??
    data.buildings.find((item) => !item.chestOpen && item.open) ??
    data.buildings[0];

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <PageHeader
        crumbs={[
          { label: "Course saya", to: "/courses" },
          { label: data.course.name, to: `/courses/${data.course.id}` },
        ]}
        eyebrow={<Badge variant="mint">{data.course.subjectName}</Badge>}
        title={`Pulau ${data.course.subjectName}`}
        description="Setiap tugas adalah satu balai. Nyalakan lima pos menuju balai dengan cara kerjamu sendiri."
      />

      <section aria-label="Ringkasan pulau" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.4fr)]">
        <PointsTile total={data.points.total} />
        <BridgeTile bridge={data.bridge} />
        <BadgeShelf badges={data.badges} className="sm:col-span-2 xl:col-span-1" />
      </section>

      {!selected ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <EmptyIllustration src="/game/academy.webp" alt="" />
            </EmptyMedia>
            <EmptyTitle>Belum ada tugas di pulau ini</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="order-2 flex min-w-0 flex-col gap-3 lg:order-1">
            <h2 className="font-heading text-lg font-semibold">Balai di pulau ini</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
              {data.buildings.map((building) => (
                <li key={building.assignmentId}>
                  <BuildingCard
                    building={building}
                    active={building.assignmentId === selected.assignmentId}
                    onSelect={() =>
                      setParams({ tugas: building.assignmentId }, { replace: true, preventScrollReset: true })
                    }
                  />
                </li>
              ))}
            </ul>
            {data.recent.length > 0 && <RecentPoints events={data.recent} />}
          </div>

          <div className="order-1 flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:order-2">
            <IslandJourney building={selected} className="mx-auto max-w-[28rem]" />
            <JourneyCaption building={selected} />
          </div>
        </section>
      )}
    </div>
  );
}

function PointsTile({ total }: { total: number }) {
  return (
    <Card className="flex-row items-center gap-4 px-5 py-4">
      <span className="shrink-0">
        <img src="/game/coin.webp" alt="" width={125} height={128} className="size-14" />
      </span>
      <div>
        <p className="font-heading text-3xl font-semibold tabular-nums">{total}</p>
        <p className="text-sm text-muted-foreground">Poin Nalar di pulau ini</p>
      </div>
    </Card>
  );
}

// A class target, not a ranking: one plank per finished journey, nobody named.
function BridgeTile({ bridge }: { bridge: IslandData["bridge"] }) {
  const share = bridge.total === 0 ? 0 : bridge.planks / bridge.total;
  return (
    <Card className="gap-3 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium">Jembatan kelas</p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {bridge.planks} dari {bridge.total} papan
        </p>
      </div>
      <div className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: Math.min(bridge.total, 40) }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-3 flex-1 rounded-[3px]",
              index < Math.round(share * Math.min(bridge.total, 40)) ? "bg-brand-mint" : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="size-3.5 shrink-0" aria-hidden="true" />
        Setiap tugas yang dituntaskan teman sekelas menambah satu papan.
      </p>
    </Card>
  );
}

export function BadgeShelf({ badges, className }: { badges: BadgeProgress[]; className?: string }) {
  return (
    <Card className={cn("flex-row flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4", className)}>
      {badges.map((badge) => {
        const copy = badgeCopy[badge.id];
        return (
          <div key={badge.id} className="flex min-w-[10rem] flex-1 items-center gap-3">
            <img
              src={copy.image}
              alt=""
              width={192}
              height={200}
              className={cn("size-12 shrink-0", !badge.earned && "opacity-45 grayscale")}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {copy.title}
                <span className="sr-only">{badge.earned ? ", sudah didapat" : ", belum didapat"}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {badge.earned ? copy.detail : `${badge.progress} dari ${badge.target} · ${copy.detail}`}
              </p>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function BuildingCard({
  building,
  active,
  onSelect,
}: {
  building: Building;
  active: boolean;
  onSelect: () => void;
}) {
  const lit = building.posts.filter((post) => post.status === "done").length;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-card transition-[transform,border-color] duration-150 active:scale-[0.98]",
        active ? "border-primary" : "border-border hover:border-foreground/30",
      )}
    >
      <img
        src="/game/academy.webp"
        alt=""
        width={304}
        height={360}
        className={cn("h-16 w-auto shrink-0", !building.open && !building.chestOpen && "opacity-60 grayscale")}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate font-medium">{building.title}</span>
        <span className="flex items-center gap-1" aria-label={`${lit} dari 5 pos menyala`}>
          {building.posts.map((post) => (
            <span
              key={post.stage}
              aria-hidden="true"
              className={cn(
                "h-1.5 flex-1 rounded-full",
                post.status === "done" && "bg-brand-mint",
                post.status === "current" && "bg-[#f5b83d]",
                post.status === "locked" && "bg-muted",
              )}
            />
          ))}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {building.chestOpen
            ? `Peti terbuka · ${building.points} poin`
            : building.submissionStatus === "in_progress"
              ? `${lit} dari 5 pos · ${building.points} poin`
              : building.open
                ? `Tenggat ${formatDateTime(building.dueAt)}`
                : "Sudah ditutup"}
        </span>
      </span>
    </button>
  );
}

function JourneyCaption({ building }: { building: Building }) {
  const current = building.posts.find((post) => post.status === "current");
  const href = `/assignments/${building.assignmentId}`;
  return (
    <Card className="gap-3 px-5 py-4">
      <p className="font-heading font-semibold">{building.title}</p>
      <p className="text-sm text-muted-foreground">
        {building.chestOpen
          ? "Kelima pos sudah menyala. Peti berisi laporan reflektif dan Index tugas ini, hanya untukmu dan gurumu."
          : current
            ? `Pos berikutnya: ${postNames[current.stage]}.`
            : building.open
              ? "Mulai dari pos pertama: tulis draf dengan pikiranmu sendiri."
              : "Tugas ini sudah ditutup."}
      </p>
      {(building.open || building.chestOpen) && (
        <Button render={<Link to={href} />} className="self-start">
          {building.chestOpen ? "Buka peti" : current ? "Lanjutkan" : "Masuk balai"}
          <ArrowRight data-icon="inline-end" />
        </Button>
      )}
    </Card>
  );
}

function RecentPoints({ events }: { events: PointEvent[] }) {
  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle>Poin terakhir</CardTitle>
        <CardDescription>Poin datang dari cara kerjamu, bukan dari skor atau Index.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {events.map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
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
      </CardContent>
    </Card>
  );
}

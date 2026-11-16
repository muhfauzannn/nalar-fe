import { ArrowRight, ImagePlus, Plus, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { LABS } from "~/features/labs";
import { rasterizeSvg } from "~/features/lms/world3d/lab-picture";

import { IDEAS, RECIPES, matchImage, matchText, type CraftMatch } from "./match";
import { Sticker } from "./stickers/Sticker";
import { BENGKEL, bengkel, gir } from "./stickers/icons";
import "./workshop.css";

type CatalogLab = { key: string; title: string; subject: string };

type Request = { text: string } | { file: File; preview: string };

type Phase =
  | { at: "idle" }
  | { at: "crafting"; request: Request; step: number; steps: string[] }
  | { at: "done"; request: Request; matches: CraftMatch[]; shown: string }
  | { at: "none"; request: Request };

/** How long the forge "works", per step: long enough to watch, short enough to not be a wait. */
const STEP_MS = 650;

const asked = (request: Request) => ("text" in request ? request.text : request.file.name);

/**
 * Bengkel lab: the teacher asks for a lab by describing its tool or dropping a photo, and the workshop forges it.
 * Underneath it matches the request against the labs Bernalar ships (match.ts); generation comes later.
 * Every state plays on one centred stage, so asking, forging and the result read as one screen changing.
 */
export function LabWorkshop({
  available,
  pending,
  onAttach,
}: {
  available: CatalogLab[];
  pending: boolean;
  onAttach: (key: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ at: "idle" });
  const [query, setQuery] = useState("");
  const [over, setOver] = useState(false);
  const [manual, setManual] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const keys = available.map((lab) => lab.key);
  const labOf = (key: string) => available.find((lab) => lab.key === key);

  // a lab that was just attached leaves the catalog: the stage clears for the next one
  useEffect(() => {
    if (phase.at === "done" && !keys.includes(phase.shown)) {
      setQuery("");
      setPhase({ at: "idle" });
    }
  }, [keys.join(), phase]);

  async function craft(request: Request) {
    const matching = "text" in request ? Promise.resolve(matchText(request.text, keys)) : matchImage(request.file, keys);
    const quick = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const first = (await matching)[0];
    const parts = first ? (RECIPES[first.key]?.parts ?? []) : [];
    const steps = [
      "text" in request ? "Membaca permintaanmu" : "Memindai foto alat",
      ...parts.map((part) => `Menempa ${part.toLowerCase()}`),
      first ? "Menguji misi lab" : "Mencari cetak biru",
    ];
    setPhase({ at: "crafting", request, step: 0, steps });
    for (let step = 1; step <= steps.length; step++) {
      await new Promise((done) => setTimeout(done, quick ? 220 : STEP_MS));
      setPhase((now) => (now.at === "crafting" && now.request === request ? { ...now, step } : now));
    }
    const matches = await matching;
    setPhase((now) => {
      if (now.at !== "crafting" || now.request !== request) return now;
      return matches.length ? { at: "done", request, matches, shown: matches[0].key } : { at: "none", request };
    });
  }

  function submitText(text: string) {
    const trimmed = text.trim();
    if (trimmed) void craft({ text: trimmed });
  }

  function submitFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    void craft({ file, preview: URL.createObjectURL(file) });
  }

  function reset() {
    if (phase.at !== "idle" && "file" in phase.request) URL.revokeObjectURL(phase.request.preview);
    setPhase({ at: "idle" });
  }

  if (available.length === 0) {
    return <p className="text-sm text-muted-foreground">Semua lab di katalog sudah dipasang di lesson ini.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        data-over={(phase.at === "idle" && over) || undefined}
        onDragOver={(event) => {
          if (phase.at !== "idle") return;
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (phase.at === "idle") submitFile(event.dataTransfer.files[0]);
        }}
        className="workshop-stage flex min-h-[26rem] flex-col items-center justify-center rounded-[2rem] px-4 py-10 text-center sm:px-10"
      >
        {phase.at === "idle" && (
          <Scene key="idle" art={<Sticker icon={gir} palette={BENGKEL} label="Roda gigi bengkel" />}>
            <h3 className="font-heading text-2xl font-semibold tracking-tight">Rakit lab baru</h3>
            <p className="mt-1 text-sm text-muted-foreground">Sebut alat atau konsepnya, atau tarik foto alatnya ke sini.</p>
            <form
              className="mt-6 flex w-full max-w-xl items-center gap-1 rounded-full bg-background p-1.5 pl-4 shadow-sm ring-1 ring-border focus-within:ring-2 focus-within:ring-ring/50"
              onSubmit={(event) => {
                event.preventDefault();
                submitText(query);
              }}
            >
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                aria-label="Alat atau konsep lab"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="mis. meriam, mikroskop"
                className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Unggah foto alat"
                title="Unggah foto alat"
                onClick={() => fileInput.current?.click()}
              >
                <ImagePlus />
              </Button>
              <Button type="submit" className="h-10 rounded-full px-5" disabled={!query.trim()}>
                Rakit
                <ArrowRight data-icon="inline-end" />
              </Button>
            </form>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                submitFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <p className="mt-4 flex flex-wrap justify-center gap-x-1 gap-y-1 text-sm text-muted-foreground" aria-label="Contoh permintaan">
              <span>Coba:</span>
              {IDEAS.map((idea, index) => (
                <span key={idea}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(idea);
                      submitText(idea);
                    }}
                    className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                  >
                    {idea}
                  </button>
                  {index < IDEAS.length - 1 && ","}
                </span>
              ))}
            </p>
          </Scene>
        )}

        {phase.at === "crafting" && <Forge request={phase.request} step={phase.step} steps={phase.steps} />}

        {phase.at === "done" && (
          <Result
            key={phase.shown}
            matches={phase.matches}
            shown={phase.shown}
            labOf={labOf}
            pending={pending}
            onShow={(key) => setPhase({ ...phase, shown: key })}
            onAttach={() => onAttach(phase.shown)}
            onReset={reset}
          />
        )}

        {phase.at === "none" && (
          <Scene key="none" art={<Sticker icon={gir} palette={BENGKEL} label="Roda gigi bengkel" />}>
            <h3 className="font-heading text-xl font-semibold tracking-tight">Belum ada cetak biru untuk “{asked(phase.request)}”</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Coba sebut alatnya (mikroskop, meriam, reaktor) atau konsepnya (osmosis, laju reaksi, sinus).
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={reset}>
                <RotateCcw data-icon="inline-start" />
                Coba lagi
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset();
                  setManual(true);
                }}
              >
                Pilih dari katalog
              </Button>
            </div>
          </Scene>
        )}
      </div>

      {phase.at === "idle" && (
        <CatalogPicker available={available} open={manual} onOpen={setManual} pending={pending} onAttach={onAttach} />
      )}
    </div>
  );
}

/** One state of the stage: the art on top, the words under it, all centred. */
function Scene({ art, size = "size-28", children }: { art: ReactNode; size?: string; children: ReactNode }) {
  return (
    <div className="enter-up flex w-full flex-col items-center">
      <div className={size}>{art}</div>
      <div className="mt-3 flex w-full flex-col items-center">{children}</div>
    </div>
  );
}

/** The forge at work: a big anvil, what was asked, the current step and a thin meter under it. */
function Forge({ request, step, steps }: { request: Request; step: number; steps: string[] }) {
  const progress = Math.min(1, step / steps.length);
  const label = steps[Math.min(step, steps.length - 1)];
  return (
    <Scene key="forge" size="size-44 sm:size-56" art={<Sticker icon={bengkel} palette={BENGKEL} label="Landasan bengkel sedang menempa" />}>
      <div className="flex max-w-full items-center gap-2">
        {"file" in request && <img src={request.preview} alt="" className="size-7 shrink-0 rounded-md object-cover ring-1 ring-border" />}
        <h3 className="truncate font-heading text-xl font-semibold tracking-tight">Merakit “{asked(request)}”</h3>
      </div>
      <p key={label} className="enter-fade mt-1 text-sm text-muted-foreground" aria-live="polite">
        {label}…
      </p>
      <div
        className="mt-5 h-1 w-full max-w-60 overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-label="Lab sedang dirakit"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-brand-mint transition-[width] duration-500 ease-out-strong"
          style={{ width: `${Math.max(4, progress * 100)}%` }}
        />
      </div>
    </Scene>
  );
}

/** The finished lab, on the same stage: its real picture, its name, one line and the action. */
function Result({
  matches,
  shown,
  labOf,
  pending,
  onShow,
  onAttach,
  onReset,
}: {
  matches: CraftMatch[];
  shown: string;
  labOf: (key: string) => CatalogLab | undefined;
  pending: boolean;
  onShow: (key: string) => void;
  onAttach: () => void;
  onReset: () => void;
}) {
  const match = matches.find((item) => item.key === shown);
  const lab = labOf(shown);
  const others = matches.filter((item) => item.key !== shown).slice(0, 3);
  if (!lab) return null;
  return (
    <Scene key="done" size="aspect-[16/9] w-full max-w-md" art={<LabSnapshot labKey={shown} />}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <h3 className="font-heading text-2xl font-semibold tracking-tight">{lab.title}</h3>
        <Badge variant="mint">{lab.subject}</Badge>
      </div>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {match && match.hits.length > 0 ? `Cocok dengan ${match.hits.slice(0, 3).join(", ")}. ` : ""}
        {LABS[shown]?.challenges ?? 3} misi, dengan cerita pembuka.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button type="button" loading={pending} onClick={onAttach}>
          <Plus data-icon="inline-start" />
          Pasang lab ini
        </Button>
        <Button type="button" variant="ghost" onClick={onReset}>
          <RotateCcw data-icon="inline-start" />
          Rakit lagi
        </Button>
      </div>
      {others.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Bukan ini?{" "}
          {others.map((item, index) => (
            <span key={item.key}>
              {index > 0 && " · "}
              <button type="button" onClick={() => onShow(item.key)} className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
                {labOf(item.key)?.title ?? item.key}
              </button>
            </span>
          ))}
        </p>
      )}
    </Scene>
  );
}

const snapshots = new Map<string, string>();
const noSolve = async () => 0;

/** The real lab's figure as a picture: mounted off screen without its story, copied, and unmounted. */
function LabSnapshot({ labKey }: { labKey: string }) {
  const entry = LABS[labKey];
  const host = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState(() => snapshots.get(labKey) ?? null);
  useEffect(() => {
    if (src || !entry) return;
    let live = true;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        const figures = Array.from(host.current?.querySelectorAll<SVGSVGElement>("svg.iso-svg") ?? []);
        const area = (svg: SVGSVGElement) => svg.getBoundingClientRect().width * svg.getBoundingClientRect().height;
        const main = figures.sort((a, b) => area(b) - area(a))[0];
        try {
          if (main) {
            const url = (await rasterizeSvg(main, 1000)).toDataURL("image/png");
            snapshots.set(labKey, url);
            if (live) setSrc(url);
          }
        } catch {
          // no picture: the frame keeps its sticker
        }
      }),
    );
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }, [labKey, entry, src]);
  return (
    <>
      {src ? (
        <img src={src} alt={`Gambar lab ${entry?.title ?? labKey}`} className="enter-pop block size-full object-contain mix-blend-multiply dark:mix-blend-normal" />
      ) : (
        <div className="mx-auto aspect-square h-full">
          <Sticker icon={bengkel} palette={BENGKEL} label="Menyiapkan gambar lab" />
        </div>
      )}
      {!src && entry && (
        <div ref={host} aria-hidden="true" inert className="pointer-events-none fixed top-0 -left-[4000px] w-[900px] opacity-0">
          <entry.Component solved={[]} onSolve={noSolve} />
        </div>
      )}
    </>
  );
}

/** The plain catalog, for a teacher who already knows which lab they want. */
function CatalogPicker({
  available,
  open,
  onOpen,
  pending,
  onAttach,
}: {
  available: CatalogLab[];
  open: boolean;
  onOpen: (open: boolean) => void;
  pending: boolean;
  onAttach: (key: string) => void;
}) {
  const [picked, setPicked] = useState(available[0]?.key ?? "");
  const choice = available.some((lab) => lab.key === picked) ? picked : (available[0]?.key ?? "");
  if (!open) {
    return (
      <button type="button" onClick={() => onOpen(true)} className="self-start text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Sudah tahu labnya? Pilih langsung dari katalog
      </button>
    );
  }
  return (
    <div className="enter-up flex flex-wrap items-center gap-2 rounded-2xl bg-muted/50 p-3">
      <NativeSelect aria-label="Pilih lab dari katalog" value={choice} onChange={(event) => setPicked(event.target.value)} className="min-w-[14rem] flex-1">
        {available.map((lab) => (
          <NativeSelectOption key={lab.key} value={lab.key}>
            {lab.title} · {lab.subject}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button type="button" loading={pending} disabled={!choice} onClick={() => onAttach(choice)}>
        <Plus data-icon="inline-start" />
        Pasang lab
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Tutup katalog" onClick={() => onOpen(false)}>
        <X />
      </Button>
    </div>
  );
}

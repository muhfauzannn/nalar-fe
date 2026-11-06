import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { HAPTIC, haptic, playSound } from "~/features/game-feel";
import { cn } from "~/lib/utils";

import { labPointer } from "./pointer";
import { markStorySeen, openingRun, replayRun, resumeRun, solvedRun, storySeen, type LabStory, type Mood, type StoryRun } from "./story";

// Plays a lab's story (story.ts) in a panel under its drawing, one beat per "Lanjut", and
// keeps the lab in step: the ring on the part a beat talks about, the mission a beat opens,
// and the explanation once a mission is solved. A lab mounted only for its picture
// (world3d/lab-picture.tsx) leaves `on` off and tells nothing.

const CAT: Record<Mood, string> = {
  tenang: "/game/cat-avatar.webp",
  senang: "/game/cat-cheer.webp",
  rayakan: "/game/cat-celebrate.webp",
};

/** Time to see the result and the coin before the explanation comes in. */
const AFTER_SOLVED_MS = 1300;

export function useLabStory<Id extends string>(story: LabStory<Id>, { on, ids, done, goTo }: { on: boolean | undefined; ids: readonly Id[]; done: string[]; goTo: (mission: number) => void }) {
  const [run, setRun] = useState<StoryRun | null>(null);
  const [acted, setActed] = useState(false);
  const go = useRef(goTo);
  go.current = goTo;
  const known = useRef(done);
  const pointing = useRef(false);
  const step = run?.steps[run.at] ?? null;

  // Starts after mount: whether the opening was seen is only known in the browser.
  useEffect(() => {
    if (!on || ids.every((id) => done.includes(id))) return;
    setRun(storySeen(story.key) ? resumeRun(story, ids, done) : openingRun(story, ids, done));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, story]);

  useEffect(() => {
    const fresh = done.filter((id) => !known.current.includes(id)) as Id[];
    known.current = done;
    const solved = fresh[fresh.length - 1];
    if (!on || !solved) return;
    const timer = window.setTimeout(() => setRun(solvedRun(story, ids, done, solved)), AFTER_SOLVED_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  useEffect(() => {
    setActed(false);
    if (step?.mission !== undefined) go.current(step.mission);
    if (step?.part) {
      labPointer.show({ steps: [{ part: step.part, say: null, caption: step.caption ?? null, story: true }] }, 1);
      pointing.current = true;
    } else if (pointing.current) {
      labPointer.clear();
      pointing.current = false;
    }
  }, [step]);

  useEffect(
    () => () => {
      if (pointing.current) labPointer.clear();
    },
    [],
  );

  const end = useCallback(() => {
    markStorySeen(story.key);
    setRun(null);
  }, [story.key]);

  const next = () => {
    if (!run) return;
    haptic(HAPTIC.tap);
    if (run.at + 1 < run.steps.length) setRun({ ...run, at: run.at + 1 });
    else end();
  };
  const skip = () => {
    if (run?.then !== null && run?.then !== undefined) go.current(run.then);
    end();
  };
  const opening = step?.scene === "Pembuka";

  return {
    reading: step !== null,
    /** The tour: a part the first mission locks can still be tried. */
    touring: opening,
    /** For the mission strip, while no mission has started. */
    strip: opening ? story.title : null,
    /** One line for the AI tutor. */
    summary: step ? `Siswa sedang membaca cerita lab "${story.title}" (${step.scene}): ${step.text}` : on ? `Cerita lab ini: ${story.title}` : null,
    replay: on && !step ? () => setRun(replayRun(story, ids, done)) : undefined,
    /** The student picked a mission in the strip: the story steps aside. */
    leave: end,
    panel: step && run ? { title: story.title, step, position: run.at + 1, total: run.steps.length, last: run.at + 1 === run.steps.length, then: run.then, waiting: Boolean(step.act) && !acted, next, skip, onActed: () => setActed(true) } : null,
  };
}

type Panel = NonNullable<ReturnType<typeof useLabStory>["panel"]>;

function scrollerOf(element: Element) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return document.scrollingElement ?? document.documentElement;
}

export function LabStoryPanel({ panel }: { panel: Panel | null }) {
  const box = useRef<HTMLDivElement>(null);
  const part = panel?.step.act ? panel.step.part : undefined;
  const onActed = useRef(panel?.onActed);
  onActed.current = panel?.onActed;

  // "Coba geser": any touch on that part counts, and on a phone its slider under the drawing.
  useEffect(() => {
    const lab = box.current?.closest(".iso");
    if (!lab || !part) return;
    const selector = `[data-lab-part="${CSS.escape(part)}"], [data-lab-act="${CSS.escape(part)}"]`;
    const touched = (event: Event) => {
      const target = event.target as Element;
      if (target.closest(selector) || target.matches('input[type="range"]')) onActed.current?.();
    };
    for (const type of ["pointerdown", "keydown", "input"]) lab.addEventListener(type, touched);
    return () => {
      for (const type of ["pointerdown", "keydown", "input"]) lab.removeEventListener(type, touched);
    };
  }, [part]);

  // On a short screen the panel sticks over the drawing: a part it covers is moved clear of it.
  const ringed = panel?.step.part;
  useEffect(() => {
    if (!ringed) return;
    const frame = requestAnimationFrame(() => {
      const target = box.current?.closest(".iso")?.querySelector(`[data-lab-part="${CSS.escape(ringed)}"]`);
      if (!box.current || !target) return;
      const area = box.current.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      if (rect.bottom <= area.top || rect.top >= area.bottom) return;
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollerOf(box.current).scrollBy({ top: rect.bottom + 16 - area.top, behavior: calm ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [ringed]);

  if (!panel) return null;
  const { step } = panel;
  const label = !panel.last ? "Lanjut" : panel.then === null ? "Selesai" : "Mulai misi";
  return (
    <div ref={box} role="group" aria-label={`Cerita lab: ${panel.title}`} data-testid="lab-story" className="sticky bottom-0 z-30 border-t border-[#e4def8] bg-[#f6f3ff] px-3 py-3 sm:px-4">
      <div className="flex gap-3">
        <img key={step.mood ?? "tenang"} src={CAT[step.mood ?? "tenang"]} alt="" draggable={false} className="enter-pop pointer-events-none size-14 shrink-0 select-none object-contain sm:size-16" />
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold text-[#6a58c7]">
            {panel.title} · {step.scene}
          </p>
          <div key={panel.position} className="enter-up">
            <p aria-live="polite" className="mt-0.5 text-[14.5px] font-medium leading-snug text-[#18153a]">
              {step.text}
            </p>
            {step.findings ? (
              <ul className="mt-2 flex flex-col gap-1">
                {step.findings.map((finding) => (
                  <li key={finding} className="flex gap-1.5 text-[13px] font-semibold leading-snug text-[#14704b]">
                    <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {finding}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="text-[11.5px] font-semibold text-[#6b6b80] tabular-nums">
          {panel.position}/{panel.total}
        </span>
        {panel.waiting ? <span className="min-w-0 text-[12.5px] font-bold text-[#0f6b4a]">{step.act}</span> : null}
        <span className="flex-1" />
        {panel.last && panel.then === null ? null : (
          <button type="button" onClick={panel.skip} className="rounded-[10px] px-2 py-1.5 text-[12.5px] font-semibold text-[#5e5e72]">
            Lewati
          </button>
        )}
        <button
          type="button"
          disabled={panel.waiting}
          onClick={() => {
            if (panel.last && panel.then === null) playSound("small");
            panel.next();
          }}
          className={cn("rounded-[14px] bg-[#18153a] px-5 py-2 text-sm font-bold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-50")}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

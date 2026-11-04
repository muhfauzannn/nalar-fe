import { Check, Lock } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { announcePoints, flyCoin, HAPTIC, haptic, playSound } from "~/features/game-feel";
import { cn } from "~/lib/utils";

// The frame every Bernalar lab shares: a strip of missions with one line of
// story, values floating over the drawing, full-size controls on a phone, a
// short feedback pill, and the reward when a mission is solved for the first
// time. The drawing in the middle is each lab's own machine.

export const fmt = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",");

export type Feedback = { ok: boolean; text: string; points?: number } | null;

export function MissionStrip({ missions, active, done, story, onChoose }: { missions: Array<{ id: string }>; active: number; done: string[]; story: string; onChoose: (index: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#efebf9] px-3 py-2.5 sm:px-4">
      <div className="flex gap-1.5" role="tablist" aria-label="Misi">
        {missions.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={`Misi ${index + 1}${done.includes(item.id) ? ", selesai" : ""}`}
            onClick={() => onChoose(index)}
            className={cn(
              "grid size-8 place-items-center rounded-full text-sm font-bold transition-transform duration-150 active:scale-[0.94]",
              index === active ? "bg-[#18153a] text-white" : done.includes(item.id) ? "bg-[#e6f8f0] text-[#14704b]" : "bg-white text-[#18153a] ring-1 ring-[#e4def8]",
            )}
          >
            {done.includes(item.id) ? <Check className="size-4" aria-hidden="true" /> : index + 1}
          </button>
        ))}
      </div>
      <p className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-[#18153a]">{story}</p>
    </div>
  );
}

/** A value floating over the drawing at a point of its viewBox, kept inside the card. */
export function Float({ at: point, size, dx = 0, dy = 0, tone, children }: { at: [number, number]; size: [number, number]; dx?: number; dy?: number; tone: "handle" | "locked" | "plain" | "ghost" | "good" | "bad" | "hint" | "dark"; children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      style={{ left: `${Math.min(93, Math.max(7, (point[0] / size[0]) * 100))}%`, top: `${(point[1] / size[1]) * 100}%`, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))` }}
      className={cn(
        "pointer-events-none absolute flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums transition-[left,top] duration-75",
        tone === "handle" && "bg-[#4bd29f] text-[#04352a] shadow-[0_2px_8px_rgba(75,210,159,.45)]",
        tone === "locked" && "bg-[#ece9f6] text-[#5e5e72]",
        tone === "plain" && "bg-white/90 text-[#18153a] ring-1 ring-[#e4def8]",
        tone === "ghost" && "px-0 text-[10px] font-semibold text-[#8a8a8f]",
        tone === "good" && "bg-[#14704b] text-white",
        tone === "bad" && "bg-[#b42f34] text-white",
        tone === "dark" && "bg-[#18153a]/85 text-white",
        tone === "hint" && "parabola-breathe bg-transparent px-0 text-[11px] font-bold text-[#0f6b4a]",
      )}
    >
      {tone === "locked" ? <Lock className="size-3" aria-hidden="true" /> : null}
      {children}
    </div>
  );
}

export function PhoneSlider({ label, value, min, max, step, unit, locked, digits, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; locked: boolean; digits?: number; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#18153a]">
      <span className="flex items-center justify-between">
        <span className="flex items-center gap-1">
          {locked ? <Lock className="size-3 text-[#8a8a8f]" aria-hidden="true" /> : null}
          {label}
        </span>
        <span className="tabular-nums text-[#14704b]">
          {fmt(value, digits ?? (step < 1 ? 1 : 0))}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={locked} onChange={(event) => onChange(Number(event.target.value))} className="h-6 w-full accent-[#4bd29f] disabled:opacity-50" />
    </label>
  );
}

export function FeedbackPill({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <span role="status" className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold", feedback.ok ? "bg-[#e6f8f0] text-[#14704b]" : "bg-[#fdecec] text-[#a5282d]")}>
      {feedback.ok ? <Check className="size-3.5" aria-hidden="true" /> : null}
      {feedback.text}
      {feedback.points ? <b className="ml-1">+{feedback.points}</b> : null}
    </span>
  );
}

export function ChoiceChips<T extends string>({ label, options, value, disabled, onChange }: { label: string; options: ReadonlyArray<readonly [T, string]>; value: T | null; disabled?: boolean; onChange: (value: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {options.map(([option, text]) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          disabled={disabled}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12.5px] font-semibold ring-1 transition-transform duration-150 active:scale-[0.96] disabled:opacity-60",
            value === option ? "bg-[#18153a] text-white ring-[#18153a]" : "bg-white text-[#18153a] ring-[#e4def8]",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function ActionButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-[14px] bg-[#18153a] px-5 py-2.5 text-sm font-bold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-50">
      {children}
    </button>
  );
}

/**
 * Solves a mission: plays the reward, saves it once on the server, and flies a
 * coin from where it happened in the drawing.
 */
export function useMissions<Id extends string>(solved: string[], onSolve: (challenge: Id) => Promise<number>) {
  const [done, setDone] = useState<string[]>(solved);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const miss = (text: string, soft = false) => {
    playSound(soft ? "small" : "bonk");
    haptic(HAPTIC.tap);
    setFeedback({ ok: soft, text });
  };
  const win = async (id: Id, text: string, from?: { x: number; y: number }) => {
    playSound("small");
    haptic(HAPTIC.award);
    setFeedback({ ok: true, text });
    if (done.includes(id)) return;
    setDone((list) => [...list, id]);
    try {
      const points = await onSolve(id);
      setFeedback({ ok: true, text, points });
      if (points > 0 && from) {
        flyCoin(from);
        window.setTimeout(() => announcePoints(points), 800);
      }
    } catch {
      setFeedback({ ok: true, text: `${text} (poin belum tersimpan)` });
    }
  };
  return { done, feedback, setFeedback, miss, win };
}

/**
 * Tells the lab's AI tutor what is on the screen: one line built from the parts
 * that are set, sent whenever it changes.
 */
export function useLabState(onState: ((summary: string) => void) | undefined, parts: Array<string | false | null | undefined>) {
  const summary = parts.filter(Boolean).join(". ");
  useEffect(() => {
    onState?.(summary);
  }, [onState, summary]);
}

/** Where a point of an SVG's viewBox is on the page, for the reward coin. */
export function pagePoint(svg: SVGSVGElement | null, point: [number, number], size: [number, number]) {
  if (!svg) return undefined;
  const box = svg.getBoundingClientRect();
  return { x: box.left + (point[0] / size[0]) * box.width, y: box.top + (point[1] / size[1]) * box.height };
}

/** Drag in an SVG: the pointer's position in its viewBox. */
export function viewPoint(svg: SVGSVGElement | null, clientX: number, clientY: number): [number, number] | null {
  const matrix = svg?.getScreenCTM();
  if (!svg || !matrix) return null;
  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  return [point.x, point.y];
}

/** Solves p − origin = a·ex + b·ez: a point on screen back into a plane's own axes. */
export function inPlane(p: [number, number], origin: [number, number], ex: [number, number], ez: [number, number]): [number, number] {
  const dx = p[0] - origin[0];
  const dy = p[1] - origin[1];
  const det = ex[0] * ez[1] - ex[1] * ez[0];
  return [(dx * ez[1] - dy * ez[0]) / det, (ex[0] * dy - ex[1] * dx) / det];
}

// `relative`: the tutor's pointer (lab-pointer.tsx) is drawn over the card.
export const labCard = "iso relative overflow-hidden rounded-[22px] border border-[#e9e4f8] bg-[#fbfaf7]";

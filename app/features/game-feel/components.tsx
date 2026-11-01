import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { http } from "~/lib/http";
import { countUp, gameGsap, POINTS_EVENT, prefersReducedMotion, TOAST_EVENT, type GameToast } from "./motion";
import { HAPTIC, haptic, isMuted, onSoundChange, playSound, setMuted, unlockSound } from "./sound";

/**
 * Wires the game feel into the app shell: the first tap unlocks sound (browsers
 * allow nothing before it), and every element marked `data-press` clicks and
 * buzzes when tapped. The press scale itself is CSS (see app.css).
 */
export function GameFeelRoot() {
  useEffect(() => {
    const unlock = () => unlockSound();
    const press = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.("[data-press]")) {
        playSound("click");
        haptic(HAPTIC.tap);
      }
    };
    document.addEventListener("pointerdown", unlock, { capture: true });
    document.addEventListener("click", press, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", unlock, { capture: true });
      document.removeEventListener("click", press, { capture: true });
    };
  }, []);
  return null;
}

export function SoundToggle() {
  const [muted, setState] = useState(false);
  useEffect(() => {
    setState(isMuted());
    return onSoundChange(() => setState(isMuted()));
  }, []);
  const label = muted ? "Nyalakan suara" : "Matikan suara";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={label}
            aria-pressed={muted}
            onClick={() => {
              unlockSound();
              setMuted(!muted);
            }}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

type Level = { level: number; into: number; needed: number; title: string };

/**
 * Level and Poin Nalar in the app header. Coins fly here, so it is the one
 * place every reward lands. It loads once and then follows announcePoints().
 */
export function GameHud() {
  const [points, setPoints] = useState<number | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const shown = useRef<number | null>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let alive = true;
    http
      .get<{ total: number; level: Level }>("/api/student/points")
      .then((data) => {
        if (!alive) return;
        shown.current = data.total;
        setPoints(data.total);
        setLevel(data.level);
      })
      .catch(() => {});
    const onPoints = (event: Event) => {
      const delta = (event as CustomEvent<{ delta: number }>).detail.delta;
      if (shown.current === null) return;
      const from = shown.current;
      const total = from + delta;
      shown.current = total;
      setPoints(total);
      setLevel((current) => (current ? levelFor(total) : current));
      countUp(from, total, (value) => {
        if (label.current) label.current.textContent = value.toLocaleString("id-ID");
      });
    };
    window.addEventListener(POINTS_EVENT, onPoints);
    return () => {
      alive = false;
      window.removeEventListener(POINTS_EVENT, onPoints);
    };
  }, []);

  if (points === null) return null;
  const share = level ? level.into / level.needed : 0;
  const ring = 2 * Math.PI * 9;
  return (
    <Link to="/lencana" className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 ring-1 ring-border transition-colors hover:bg-muted" aria-label={`Level ${level?.level ?? 1}, ${points} Poin Nalar`}>
      {level && (
        <span className="relative hidden size-7 sm:block" aria-hidden="true">
          <svg viewBox="0 0 22 22" className="absolute inset-0 size-full -rotate-90">
            <circle cx="11" cy="11" r="9" fill="none" stroke="#d3c5f8" strokeWidth="3" />
            <circle cx="11" cy="11" r="9" fill="none" stroke="#4bd29f" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.max(0.01, share) * ring} ${ring}`} />
          </svg>
          <b className="absolute inset-0 grid place-items-center text-[0.6875rem] font-bold">{level.level}</b>
        </span>
      )}
      <span id="game-coins" className="flex items-center gap-1">
        <img src="/game/coin.webp" alt="" width={125} height={128} className="size-6" />
        <span ref={label} className="font-heading text-sm font-semibold tabular-nums">
          {points.toLocaleString("id-ID")}
        </span>
      </span>
    </Link>
  );
}

// Mirrors the server's levels (100, 150, 200, ... points per level).
function levelFor(total: number): Level {
  const titles = ["Pendatang", "Penjelajah", "Penanya", "Penimbang", "Pengkritik", "Perevisi", "Penalar", "Pemikir Mandiri", "Cendekia"];
  let level = 1;
  let floor = 0;
  while (total >= floor + 100 + 50 * (level - 1)) {
    floor += 100 + 50 * (level - 1);
    level++;
  }
  return { level, into: total - floor, needed: 100 + 50 * (level - 1), title: titles[Math.min(level, titles.length) - 1]! };
}

/** Shows gameToast() calls: a check that draws itself, then gone after two seconds. */
export function GameToaster() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const g = gameGsap();
    const show = (event: Event) => {
      const toast = (event as CustomEvent<GameToast>).detail;
      if (!host.current) return;
      const el = document.createElement("div");
      el.className = "flex items-center gap-2.5 rounded-2xl bg-[#18153a] px-3 py-2.5 text-white shadow-lg";
      el.innerHTML = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style="flex:none"><circle cx="13" cy="13" r="12" fill="#4bd29f"/><path d="M7.5 13.5l3.6 3.6 7.4-7.6" fill="none" stroke="#04352a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="20" stroke-dashoffset="20"/></svg><div style="min-width:0"><strong style="display:block;font-size:13.5px"></strong><span style="font-size:12px;color:#d3c5f8"></span></div><span style="margin-left:auto;font-weight:800;color:#4bd29f"></span>`;
      el.querySelector("strong")!.textContent = toast.title;
      el.querySelector("div > span")!.textContent = toast.sub ?? "";
      (el.lastElementChild as HTMLElement).textContent = toast.points ?? "";
      host.current.appendChild(el);
      if (toast.sound) playSound(toast.sound);
      const check = el.querySelector("path")!;
      const timeline = g.timeline({ onComplete: () => el.remove() });
      if (prefersReducedMotion()) {
        timeline.set(check, { strokeDashoffset: 0 }).from(el, { opacity: 0, duration: 0.15 }).to(el, { opacity: 0, duration: 0.2 }, "+=2.2");
      } else {
        timeline
          .from(el, { y: -26, opacity: 0, scale: 0.94, duration: 0.42, ease: "nalar.spring" })
          .to(check, { strokeDashoffset: 0, duration: 0.28, ease: "power2.out" }, "-=0.2")
          .to(el, { y: -14, opacity: 0, duration: 0.3, ease: "power2.in" }, "+=2.1");
      }
    };
    window.addEventListener(TOAST_EVENT, show);
    return () => window.removeEventListener(TOAST_EVENT, show);
  }, []);
  return (
    <div
      ref={host}
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-[calc(4rem+env(safe-area-inset-top))] z-[70] flex flex-col gap-2 sm:left-auto sm:right-6 sm:w-[22rem]"
    />
  );
}

/** Runs `effect` when `value` turns true while the page is open (never on first render). */
export function useOnBecomeTrue(value: boolean, effect: () => void) {
  const previous = useRef(value);
  const run = useRef(effect);
  run.current = effect;
  useEffect(() => {
    if (value && !previous.current) run.current();
    previous.current = value;
  }, [value]);
}

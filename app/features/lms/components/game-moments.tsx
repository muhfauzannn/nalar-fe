import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";

import { confetti, gameGsap, HAPTIC, haptic, playSound, prefersReducedMotion } from "~/features/game-feel";
import { badgeCopy } from "../lib/game";
import type { BadgeProgress, PointsData } from "../types";

// Macro moments of the "Bernalar Game Feel" prototype: the chest, the badge
// reveal and the level-up. Each is one GSAP timeline (anticipate → act →
// settle) on a dimmed overlay; a tap skips to the end and a second one closes.
// Under reduced motion each becomes a short fade with the same sound.

type Build = (parts: { root: HTMLDivElement; panel: HTMLDivElement; timeline: gsap.core.Timeline }) => void;

function MacroOverlay({ children, build, onClose, label }: { children: ReactNode; build: Build; onClose: () => void; label: string }) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const closing = useRef(false);

  useLayoutEffect(() => {
    if (!root.current || !panel.current) return;
    const g = gameGsap();
    const host = root.current, card = panel.current;
    // A context so cleanup reverts what from() set: StrictMode runs this twice,
    // and a killed from() would leave the overlay invisible at its start state.
    const context = g.context(() => {
      const tl = g.timeline();
      timeline.current = tl;
      build({ root: host, panel: card, timeline: tl });
    }, host);
    return () => context.revert();
    // The moment plays once for the content it opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    if (closing.current || !root.current) return;
    closing.current = true;
    gameGsap().to(root.current, { opacity: 0, duration: 0.2, onComplete: onClose });
  }

  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[90] grid place-items-center p-4 [color-scheme:light]"
      onClick={(event) => {
        const tl = timeline.current;
        if (tl && tl.progress() < 1) {
          tl.progress(1);
          if (!(event.target as Element).closest("[data-close]")) return;
        }
        if ((event.target as Element).closest("[data-close]") || event.target === event.currentTarget.firstElementChild) close();
      }}
    >
      <div data-scrim className="absolute inset-0 bg-[#18153a]/72" />
      <div
        ref={panel}
        className="relative flex max-h-full w-full max-w-[22.5rem] flex-col items-center gap-2.5 overflow-y-auto rounded-[1.875rem] bg-[#18153a] px-5 pb-4.5 pt-6 text-center text-white"
      >
        <div data-rays aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[34%] -ml-[16.25rem] -mt-[16.25rem] size-[32.5rem] rounded-full bg-[repeating-conic-gradient(from_0deg,rgb(75_210_159/0.18)_0_8deg,transparent_8deg_22deg)] opacity-0 [mask-image:radial-gradient(closest-side,#000_30%,transparent_72%)]" />
        {children}
        <p className="text-[0.6875rem] text-white/55">Ketuk di mana saja untuk melewati</p>
      </div>
    </div>,
    document.body,
  );
}

function fadeIn({ root, timeline }: { root: HTMLDivElement; timeline: gsap.core.Timeline }, sound: Parameters<typeof playSound>[0]) {
  timeline.from(root, { opacity: 0, duration: 0.2 }).add(() => {
    playSound(sound);
    haptic(HAPTIC.macro);
  });
}

export function ChestMoment({ points, assignmentId, onClose }: { points: number; assignmentId: string; onClose: () => void }) {
  return (
    <MacroOverlay
      label="Peti balai terbuka"
      onClose={onClose}
      build={(parts) => {
        const { root, panel, timeline } = parts;
        const stage = panel.querySelector<HTMLElement>("[data-chest]")!;
        const open = panel.querySelector("[data-open]")!, closed = panel.querySelector("[data-closed]")!;
        const reveal = panel.querySelectorAll("[data-reveal]");
        if (prefersReducedMotion()) {
          gameGsap().set(open, { opacity: 1 });
          gameGsap().set(closed, { opacity: 0 });
          return fadeIn(parts, "chest");
        }
        gameGsap().set(reveal, { opacity: 0, y: 16 });
        timeline
          .from(root.querySelector("[data-scrim]"), { opacity: 0, duration: 0.25 })
          .from(panel, { scale: 0.85, opacity: 0, duration: 0.45, ease: "nalar.spring" }, "<");
        [0, 1, 2].forEach((shake) => {
          timeline
            .add(() => { playSound("shake", shake); haptic(10); })
            .to(stage, { rotation: shake % 2 ? 5 : -5, y: -4 - shake * 2, duration: 0.07, ease: "power2.out" })
            .to(stage, { rotation: 0, y: 0, duration: 0.12, ease: "back.out(4)" })
            .to({}, { duration: 0.08 + shake * 0.04 });
        });
        timeline
          .to(stage, { scaleY: 0.9, scaleX: 1.06, duration: 0.12, ease: "power2.in" })
          .addLabel("act")
          .add(() => { playSound("chest"); haptic(HAPTIC.macro); })
          .to(stage, { scaleY: 1.08, scaleX: 0.96, y: -10, duration: 0.18, ease: "power2.out" })
          .to(open, { opacity: 1, duration: 0.12 }, "<")
          .to(closed, { opacity: 0, duration: 0.12 }, "<")
          .to(stage, { scale: 1, y: 0, duration: 0.5, ease: "nalar.spring" })
          .to(panel.querySelector("[data-rays]"), { opacity: 1, rotation: 50, duration: 2, ease: "none" }, "act");
        for (let index = 0; index < 10; index++) {
          const coin = document.createElement("img");
          coin.src = "/game/coin.webp";
          coin.alt = "";
          Object.assign(coin.style, { position: "absolute", left: "calc(50% - 15px)", top: "110px", width: "30px", height: "30px", pointerEvents: "none" });
          panel.appendChild(coin);
          timeline.fromTo(
            coin,
            { scale: 0.4, opacity: 1 },
            { duration: 1.2, scale: 1, physics2D: { velocity: 330 + (index % 4) * 60, angle: -90 + (index - 4.5) * 13, gravity: 1000 }, rotation: (index - 5) * 70, opacity: 0, ease: "none", onComplete: () => coin.remove() },
            `act+=${index * 0.02}`,
          );
        }
        timeline.to(reveal, { opacity: 1, y: 0, stagger: 0.08, duration: 0.4, ease: "nalar.out" }, "act+=0.35");
      }}
    >
      <div data-chest className="relative size-40">
        <img data-closed src="/game/chest-closed.webp" alt="" width={240} height={236} className="absolute inset-0 size-full object-contain" />
        <img data-open src="/game/chest.webp" alt="" width={227} height={240} className="absolute inset-0 size-full object-contain opacity-0" />
      </div>
      <p data-reveal className="font-heading text-[1.375rem] font-extrabold">Peti balai terbuka</p>
      <div data-reveal className="w-full rounded-[1.25rem] bg-white p-3.5 text-left text-[#18153a]">
        <b className="block">Laporan reflektif · hanya untukmu dan gurumu</b>
        <p className="mt-1 text-[0.8125rem] text-[#5e5e72]">
          Kelima pos sudah menyala. Lihat bagaimana kamu memakai AI di tugas ini dan saran untuk tugas berikutnya.
        </p>
        <p className="mt-1 text-[0.8125rem] text-[#5e5e72]">
          <b className="text-[#18153a]">+{points} Poin Nalar</b> dari balai ini.
        </p>
      </div>
      <Link data-reveal data-close to={`/assignments/${assignmentId}`} className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#4bd29f] font-bold text-[#04352a] transition-transform duration-150 active:scale-[0.98]">
        Baca laporan
      </Link>
      <button data-reveal data-close type="button" className="text-sm font-semibold text-[#c6c1f1]">
        Nanti saja
      </button>
    </MacroOverlay>
  );
}

export function BadgeMoment({ badge, onClose }: { badge: BadgeProgress["id"]; onClose: () => void }) {
  const copy = badgeCopy[badge];
  return (
    <MacroOverlay
      label={`Lencana baru: ${copy.title}`}
      onClose={onClose}
      build={(parts) => {
        const { root, panel, timeline } = parts;
        const medal = panel.querySelector<HTMLElement>("[data-medal]")!;
        const reveal = panel.querySelectorAll("[data-reveal]");
        if (prefersReducedMotion()) return fadeIn(parts, "land");
        const g = gameGsap();
        g.set(reveal, { opacity: 0 });
        let lastHalf = 0;
        let ticks = 0;
        timeline
          .from(root.querySelector("[data-scrim]"), { opacity: 0, duration: 0.25 })
          .from(panel, { scale: 0.85, opacity: 0, duration: 0.4, ease: "nalar.spring" }, "<")
          // Always 4.5 turns and always the badge already earned: a reveal, not a draw.
          .fromTo(medal, { rotationY: 180 }, {
            rotationY: 1800,
            duration: 2.1,
            ease: "power4.out",
            onUpdate() {
              const half = Math.floor((Number(g.getProperty(medal, "rotationY")) - 90) / 180);
              if (half !== lastHalf) {
                lastHalf = half;
                playSound("spin", ticks++);
              }
            },
          })
          .add(() => { playSound("land"); haptic(HAPTIC.macro); })
          .fromTo(panel.querySelector("[data-shine]"), { backgroundPosition: "120% 0" }, { backgroundPosition: "-60% 0", duration: 0.7, ease: "power2.inOut" })
          .to(panel.querySelector("[data-rays]"), { opacity: 1, rotation: 40, duration: 1.6, ease: "none" }, "<")
          .add(confetti(panel, 22), "<")
          .to(reveal, { opacity: 1, stagger: 0.06, duration: 0.3 }, "<0.1");
      }}
    >
      <p className="text-[0.8125rem] font-semibold text-[#c6c1f1]">Lencana baru</p>
      <div className="size-36 [perspective:900px]">
        <div data-medal className="relative size-full [transform-style:preserve-3d]">
          <div className="absolute inset-0 grid place-items-center rounded-full [backface-visibility:hidden]">
            <img src={copy.image} alt="" width={192} height={200} className="size-full object-contain" />
            <span data-shine className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(115deg,transparent_35%,rgb(255_255_255/0.65)_50%,transparent_65%)] bg-[length:250%_100%] bg-[position:120%_0]" />
          </div>
          <div className="absolute inset-0 grid place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#a99be8,#25225f_70%)] font-heading text-6xl font-extrabold text-[#d3c5f8] shadow-[inset_0_0_0_10px_#3a3670] [backface-visibility:hidden] [transform:rotateY(180deg)]">
            ?
          </div>
        </div>
      </div>
      <p data-reveal className="font-heading text-2xl font-extrabold">{copy.title}</p>
      <p data-reveal className="text-[0.8125rem] text-[#c6c1f1]">{copy.detail}</p>
      <p data-reveal className="text-[0.6875rem] text-white/55">Lencana ini sudah pasti kamu dapat; putarannya hanya cara menunjukkannya.</p>
      <button data-reveal data-close type="button" className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#4bd29f] font-bold text-[#04352a] transition-transform duration-150 active:scale-[0.98]">
        Simpan ke koleksi
      </button>
    </MacroOverlay>
  );
}

export function LevelMoment({ before, points, onClose }: { before: number; points: PointsData; onClose: () => void }) {
  const { level } = points;
  const ring = 2 * Math.PI * 56;
  return (
    <MacroOverlay
      label={`Naik ke Level ${level.level}`}
      onClose={onClose}
      build={(parts) => {
        const { root, panel, timeline } = parts;
        const number = panel.querySelector<HTMLElement>("[data-number]")!;
        const fill = panel.querySelector("[data-fill]")!;
        const reveal = panel.querySelectorAll("[data-reveal]");
        if (prefersReducedMotion()) {
          number.textContent = String(level.level);
          fill.setAttribute("stroke-dasharray", `${ring} ${ring}`);
          return fadeIn(parts, "arp");
        }
        timeline
          .from(root.querySelector("[data-scrim]"), { opacity: 0, duration: 0.25 })
          .from(panel, { scale: 0.8, y: 30, opacity: 0, duration: 0.5, ease: "nalar.spring" }, "<0.05")
          .fromTo(fill, { attr: { "stroke-dasharray": `${ring * 0.85} ${ring}` } }, { attr: { "stroke-dasharray": `${ring} ${ring}` }, duration: 0.6, ease: "power2.inOut" })
          .add(() => { playSound("arp"); haptic(HAPTIC.macro); })
          .to(number, { scale: 0.2, opacity: 0, duration: 0.12, ease: "power2.in" })
          .add(() => { number.textContent = String(level.level); })
          .to(number, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(3)" })
          .to(panel.querySelector("[data-rays]"), { opacity: 1, rotation: 40, duration: 1.8, ease: "none" }, "<")
          .add(confetti(panel, 30), "<")
          .from(reveal, { y: 14, opacity: 0, stagger: 0.07, duration: 0.35, ease: "nalar.out" }, "<0.1");
      }}
    >
      <p className="text-[0.8125rem] font-semibold text-[#c6c1f1]">Kamu naik level</p>
      <div className="relative size-28">
        <svg viewBox="0 0 132 132" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="66" cy="66" r="56" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="10" />
          <circle data-fill cx="66" cy="66" r="56" fill="none" stroke="#4bd29f" strokeWidth="10" strokeLinecap="round" strokeDasharray={`0 ${ring}`} />
        </svg>
        <span className="absolute inset-x-0 top-4 text-[0.6875rem] text-[#c6c1f1]">LEVEL</span>
        <b data-number className="absolute inset-0 grid place-items-center font-heading text-5xl font-extrabold tabular-nums">
          {before}
        </b>
      </div>
      <p data-reveal className="font-heading text-2xl font-extrabold">{level.title}</p>
      <p data-reveal className="text-[0.8125rem] text-[#c6c1f1]">
        Poin datang dari cara kerjamu: draf sendiri, pertanyaan yang baik, revisi yang sungguh-sungguh.
      </p>
      <div data-reveal className="grid w-full grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white/8 p-2.5">
          <b className="block font-heading text-xl tabular-nums">{points.total}</b>
          <span className="text-[0.6875rem] text-[#c6c1f1]">Poin Nalar total</span>
        </div>
        <div className="rounded-2xl bg-white/8 p-2.5">
          <b className="block font-heading text-xl tabular-nums">{level.needed - level.into}</b>
          <span className="text-[0.6875rem] text-[#c6c1f1]">poin ke Level {level.level + 1}</span>
        </div>
      </div>
      <button data-reveal data-close type="button" className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#4bd29f] font-bold text-[#04352a] transition-transform duration-150 active:scale-[0.98]">
        Mantap, lanjut
      </button>
    </MacroOverlay>
  );
}

// ---- what the student has already seen (per device) -----------------------------

function readList(key: string) {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    return Array.isArray(value) ? (value as string[]) : null;
  } catch {
    return null;
  }
}
function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Without storage a moment may show again; nothing else depends on it.
  }
}

/** Badges earned since this device last showed one. The first visit only records them. */
export function newBadges(userId: string, badges: BadgeProgress[]) {
  const key = `nalar:badges-seen:${userId}`;
  const earned = badges.filter((badge) => badge.earned).map((badge) => badge.id);
  const seen = readList(key);
  if (seen === null) {
    writeList(key, earned);
    return [];
  }
  return earned.filter((id) => !seen.includes(id));
}
export function markBadgeSeen(userId: string, id: string) {
  const key = `nalar:badges-seen:${userId}`;
  writeList(key, [...new Set([...(readList(key) ?? []), id])]);
}

export function chestSeen(assignmentId: string) {
  return (readList("nalar:chests-opened") ?? []).includes(assignmentId);
}
export function markChestSeen(assignmentId: string) {
  writeList("nalar:chests-opened", [...new Set([...(readList("nalar:chests-opened") ?? []), assignmentId])]);
}

/** Missions completed since this device last looked, this week. The first visit only records. */
export function missionsJustDone(userId: string, missions: PointsData["missions"]) {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = monday.toISOString().slice(0, 10);
  const key = `nalar:missions-seen:${userId}`;
  const done = missions.filter((mission) => mission.progress >= mission.target).map((mission) => `${week}:${mission.id}`);
  const seen = readList(key);
  writeList(key, [...new Set([...(seen ?? []), ...done])].slice(-30));
  if (seen === null) return [];
  return missions.filter((mission) => done.includes(`${week}:${mission.id}`) && !seen.includes(`${week}:${mission.id}`));
}

/** How many planks the class bridge gained since this device last showed the island. */
export function planksAdded(courseId: string, planks: number) {
  const key = `nalar:planks:${courseId}`;
  let before: number | null = null;
  try {
    const raw = localStorage.getItem(key);
    before = raw === null ? null : Number(raw);
    localStorage.setItem(key, String(planks));
  } catch {
    return 0;
  }
  return before === null || !Number.isFinite(before) ? 0 : Math.max(0, planks - before);
}

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";

import { HAPTIC, haptic, playSound, tickThrottle } from "./sound";

// Motion tokens of the "Bernalar Game Feel" prototype: a springy settle with a
// small overshoot, a strong ease-out, and three tiers (micro 140 ms, meso
// 420–650 ms, macro 1.6–2.2 s, always skippable). Only transform and opacity
// are animated, and reduced motion swaps every moment for a short fade.

let registered = false;

/** GSAP with Bernalar's plugins and eases, registered once in the browser. */
export function gameGsap() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(CustomEase, MotionPathPlugin, Physics2DPlugin);
    CustomEase.create("nalar.spring", "M0,0 C0.18,0.9 0.3,1.16 0.48,1.07 0.64,0.99 0.8,1 1,1");
    CustomEase.create("nalar.out", "0.23,1,0.32,1");
    registered = true;
  }
  return gsap;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Resolves when a timeline finishes. */
export function finished(timeline: gsap.core.Timeline | gsap.core.Tween) {
  return new Promise<void>((resolve) => timeline.eventCallback("onComplete", () => resolve()));
}

// ---- the coin counter in the header ----------------------------------------

const COINS_ID = "game-coins";
export const POINTS_EVENT = "nalar:points";

/** Tells the header counter to count up by the points just earned. */
export function announcePoints(delta: number) {
  window.dispatchEvent(new CustomEvent(POINTS_EVENT, { detail: { delta } }));
}

/** Counts a number up with throttled ticks; jumps straight there under reduced motion. */
export function countUp(from: number, to: number, render: (value: number) => void, duration = 0.65) {
  const g = gameGsap();
  if (prefersReducedMotion() || from === to) {
    render(to);
    return g.timeline();
  }
  const tick = tickThrottle();
  const state = { value: from };
  let shown = from;
  return g.to(state, {
    value: to,
    duration,
    ease: "power1.out",
    onUpdate() {
      const next = Math.round(state.value);
      if (next !== shown) {
        shown = next;
        render(next);
        tick();
      }
    },
    onComplete: () => render(to),
  });
}

/** The header coin spins once on its edge as a coin lands. */
export function bumpCoins() {
  const holder = document.getElementById(COINS_ID);
  const img = holder?.querySelector("img");
  if (!holder || !img || prefersReducedMotion()) return;
  const g = gameGsap();
  g.timeline()
    .to(holder, { scale: 1.12, duration: 0.12, ease: "power2.out" })
    .to(img, { scaleX: 0.2, duration: 0.07, ease: "power1.in" }, 0)
    .add(() => { img.src = "/game/coin-edge.webp"; })
    .to(img, { scaleX: 0.35, duration: 0.05 })
    .add(() => { img.src = "/game/coin.webp"; })
    .to(img, { scaleX: 1, duration: 0.12, ease: "back.out(2.5)" })
    .to(holder, { scale: 1, duration: 0.18, ease: "nalar.out" }, "-=0.1");
}

/** A coin flies from a point on screen to the header counter (fixed coordinates). */
export function flyCoin(from: { x: number; y: number }, delay = 0) {
  const g = gameGsap();
  const target = document.getElementById(COINS_ID)?.querySelector("img")?.getBoundingClientRect();
  if (!target || prefersReducedMotion()) return g.timeline();
  const tx = target.left + target.width / 2;
  const ty = target.top + target.height / 2;
  const coin = document.createElement("img");
  coin.src = "/game/coin.webp";
  coin.alt = "";
  coin.setAttribute("aria-hidden", "true");
  Object.assign(coin.style, { position: "fixed", left: "0", top: "0", width: "30px", height: "30px", zIndex: "80", pointerEvents: "none" });
  document.body.appendChild(coin);
  g.set(coin, { x: from.x - 15, y: from.y - 15, scale: 0.4, opacity: 0 });
  return g
    .timeline({ delay, onComplete: () => coin.remove() })
    .to(coin, { scale: 1.15, opacity: 1, duration: 0.18, ease: "back.out(3)" })
    .to(coin, {
      duration: 0.62,
      ease: "power2.in",
      scale: 0.7,
      motionPath: {
        path: [
          { x: from.x - 15, y: from.y - 15 },
          { x: (from.x + tx) / 2 + 40, y: Math.min(from.y, ty) - 60 },
          { x: tx - 15, y: ty - 15 },
        ],
        curviness: 1.3,
      },
    })
    .add(() => {
      bumpCoins();
      haptic(6);
    });
}

/** "+25 Revisi yang sungguh-sungguh" rising above a point (fixed coordinates). */
export function awardChip(at: { x: number; y: number }, points: number, label: string) {
  const g = gameGsap();
  const chip = document.createElement("div");
  chip.innerHTML = `<b style="color:#4bd29f;margin-right:4px">+${points}</b>${label}`;
  Object.assign(chip.style, {
    position: "fixed", left: `${at.x}px`, top: `${at.y}px`, transform: "translate(-50%,-100%)", zIndex: "79",
    pointerEvents: "none", whiteSpace: "nowrap", background: "#18153a", color: "#fff", fontSize: "12px",
    fontWeight: "700", padding: "5px 10px", borderRadius: "12px",
  });
  document.body.appendChild(chip);
  if (prefersReducedMotion()) {
    return g.timeline({ onComplete: () => chip.remove() }).to(chip, { opacity: 0, duration: 0.2, delay: 1.2 });
  }
  return g
    .timeline({ onComplete: () => chip.remove() })
    .from(chip, { y: 10, scale: 0.8, opacity: 0, duration: 0.3, ease: "nalar.spring" })
    .to(chip, { y: -16, opacity: 0, duration: 0.35, ease: "power2.in" }, "+=0.9");
}

/** Confetti from the middle of an element; nothing under reduced motion. */
export function confetti(host: HTMLElement, count = 26) {
  const g = gameGsap();
  const timeline = g.timeline();
  if (prefersReducedMotion()) return timeline;
  const colors = ["#4bd29f", "#d3c5f8", "#f5b83d", "#ffffff", "#a99be8"];
  for (let index = 0; index < count; index++) {
    const piece = document.createElement("i");
    Object.assign(piece.style, {
      position: "absolute", left: "50%", top: "40%", width: "9px", height: "13px", borderRadius: "2px",
      background: colors[index % colors.length], pointerEvents: "none", zIndex: "5",
    });
    host.appendChild(piece);
    timeline.fromTo(
      piece,
      { x: 0, y: 0, rotation: 0, opacity: 1 },
      {
        duration: 1.6,
        physics2D: { velocity: 420 + (index % 5) * 70, angle: -90 + ((index / count) * 2 - 1) * 55, gravity: 900 },
        rotation: 360 + index * 40,
        opacity: 0,
        ease: "none",
        onComplete: () => piece.remove(),
      },
      index * 0.008,
    );
  }
  return timeline;
}

// ---- toasts ------------------------------------------------------------------

export const TOAST_EVENT = "nalar:game-toast";
export type GameToast = { title: string; sub?: string; points?: string; sound?: "small" | "ding" };

/** A meso-tier toast; the GameToaster in the app shell shows it. */
export function gameToast(toast: GameToast) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: toast }));
}

export { HAPTIC, haptic, playSound };

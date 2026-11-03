import { FlaskConical } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import "./iso/iso.css";
import { Dots, Line, Solid } from "./iso/react/draw";
import { ActionButton, ChoiceChips, Float, FeedbackPill, inPlane, labCard, MissionStrip, PhoneSlider, pagePoint, useMissions, viewPoint } from "./lab-ui";
import { CATALYST_MASS, CHALLENGES, CONC, DOUBLE_BAND, EA, EA_CATALYST, effectiveShare, FAST_TARGET, fmt, judge, rateOf, SAFE_TEMP, speedOf, TEMP, type ChallengeId, type Mix } from "./laju/model";
import {
  at,
  BASKET,
  basketAt,
  BENCH_ART,
  concAtThumb,
  GAUGE_ART,
  GAUGE_CENTER,
  GAUGE_READOUT,
  gaugeBand,
  glowOf,
  GLASS_ART,
  HEIGHT,
  KNOB_AXES,
  KNOB_SWEEP,
  knobAt,
  needleAt,
  PLATE_ART,
  PLUNGER_AXIS,
  SWIM,
  swimAt,
  SYRINGE_ART,
  syringeAt,
  THERMO_ART,
  thermoColumn,
  thermoMark,
  thermoMarkAt,
  WIDTH,
} from "./laju/scene";

// Lab "Reaktor tumbukan" (Kimia SMA). Particles of A (red) and B (blue) wander
// in the liquid; when they meet, most just bounce (a small ring) and a few hit
// hard enough to react (a burst, and a purple product). The heater knob, the
// syringe's plunger and the catalyst basket change how often that happens, and
// the gauge reads the true rate from laju/model.ts.

const SIZE: [number, number] = [WIDTH, HEIGHT];
const PER_MOLAR = 12;
const MAX_EACH = Math.round(CONC.max * PER_MOLAR);
const POOL = MAX_EACH * 2 + 12;
const FLASHES = 10;
const snap = (value: number, step: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value / step) * step));

type Particle = { x: number; z: number; vx: number; vz: number; kind: 0 | 1 | 2; age: number; cool: number; on: boolean };

/** "1 dari 2,2 miliar": how rare a collision with enough energy is. */
function oneIn(share: number) {
  const n = 1 / share;
  if (n >= 1e9) return `${fmt(n / 1e9)} miliar`;
  if (n >= 1e6) return `${fmt(n / 1e6, 0)} juta`;
  return fmt(n, 0);
}

export function LajuLab({ solved, onSolve }: { solved: string[]; onSolve: (challenge: ChallengeId) => Promise<number> }) {
  const firstOpen = CHALLENGES.findIndex((challenge) => !solved.includes(challenge.id));
  const [active, setActive] = useState(firstOpen === -1 ? 0 : firstOpen);
  const challenge = CHALLENGES[active]!;
  const [mix, setMix] = useState<Mix>({ temp: 300, conc: 1, catalyst: false, ...challenge.lock });
  const [guess, setGuess] = useState<"habis" | "tetap" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [touched, setTouched] = useState({ knob: false, plunger: false, basket: false });
  const { done, feedback, setFeedback, miss, win } = useMissions(solved, onSolve);
  const svg = useRef<SVGSVGElement>(null);
  const dots = useRef<Array<SVGCircleElement | null>>([]);
  const flashes = useRef<Array<SVGGElement | null>>([]);
  const basketGroup = useRef<SVGGElement>(null);
  const live = useRef(mix);
  live.current = mix;

  const locked = { temp: challenge.lock?.temp !== undefined, conc: challenge.lock?.conc !== undefined, catalyst: challenge.lock?.catalyst !== undefined };
  const rate = rateOf(mix);
  const knob = useMemo(() => knobAt(mix.temp), [mix.temp]);
  const column = useMemo(() => thermoColumn(mix.temp), [mix.temp]);
  const syringe = useMemo(() => syringeAt(mix.conc), [mix.conc]);
  const needle = useMemo(() => needleAt(rate), [rate]);
  const basket = useMemo(() => basketAt(BASKET.down), []);
  const basketLift = at([0, 0, BASKET.up - BASKET.down])[1] - at([0, 0, 0])[1];
  const band = challenge.id === "gandakan-suhu" ? gaugeBand(DOUBLE_BAND.min, DOUBLE_BAND.max) : challenge.id === "cepat-tapi-aman" ? gaugeBand(FAST_TARGET, 32) : "";
  const glow = glowOf(mix.temp);
  const hot = challenge.id === "cepat-tapi-aman" && mix.temp > SAFE_TEMP;

  // ---- the particles: a small simulation written straight to the circles ----

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parts: Particle[] = Array.from({ length: POOL }, (_, i) => spawn(i % 2 === 0 ? 0 : 1));
    const bursts = Array.from({ length: FLASHES }, () => ({ x: 0, z: 0, t: 1, big: false }));
    let nextBurst = 0;
    function spawn(kind: 0 | 1): Particle {
      const angle = Math.random() * Math.PI * 2;
      return { x: SWIM.x0 + Math.random() * (SWIM.x1 - SWIM.x0), z: SWIM.z0 + Math.random() * (SWIM.z1 - SWIM.z0), vx: Math.cos(angle), vz: Math.sin(angle), kind, age: 0, cool: 0, on: false };
    }
    function burst(x: number, z: number, big: boolean) {
      bursts[nextBurst] = { x, z, t: 0, big };
      nextBurst = (nextBurst + 1) % FLASHES;
    }
    function draw() {
      parts.forEach((p, i) => {
        const el = dots.current[i];
        if (!el) return;
        if (!p.on) {
          el.setAttribute("r", "0");
          return;
        }
        const [sx, sy] = swimAt(p.x, p.z);
        el.setAttribute("cx", sx.toFixed(1));
        el.setAttribute("cy", sy.toFixed(1));
        el.setAttribute("r", p.kind === 2 ? "2.8" : "2.2");
        el.setAttribute("fill", p.kind === 0 ? "#e5484d" : p.kind === 1 ? "#3e7bfa" : "#7c5cf0");
        el.setAttribute("opacity", p.kind === 2 ? String(Math.max(0, 1 - Math.max(0, p.age - 1.2) / 0.5)) : String(Math.min(1, p.age / 0.3)));
      });
      bursts.forEach((b, i) => {
        const el = flashes.current[i];
        if (!el) return;
        if (b.t >= 1) {
          el.setAttribute("opacity", "0");
          return;
        }
        const [sx, sy] = swimAt(b.x, b.z);
        const grow = b.big ? 1 + b.t * 2.2 : 1 + b.t * 1.2;
        el.setAttribute("transform", `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(${grow.toFixed(2)})`);
        el.setAttribute("opacity", String(1 - b.t));
        el.dataset.big = b.big ? "1" : "0";
      });
    }
    function step(dt: number) {
      const m = live.current;
      const each = Math.round(m.conc * PER_MOLAR);
      const speed = 9 * speedOf(m.temp) ** 4;
      // the chance that a meeting reacts follows k (shown far more often than in reality, so it can be seen)
      const chance = Math.min(1, 0.06 * (rateOf(m) / m.conc));
      // keep `each` of A and of B switched on
      const count = [0, 0];
      for (const p of parts) if (p.on && p.kind < 2) count[p.kind]! += 1;
      for (const kind of [0, 1] as const) {
        for (const p of parts) {
          if (count[kind]! >= each) break;
          if (p.on) continue;
          Object.assign(p, spawn(kind), { on: true });
          count[kind]! += 1;
        }
      }
      for (const p of parts) {
        if (p.on && p.kind < 2 && count[p.kind]! > each) {
          p.on = false;
          count[p.kind]! -= 1;
        }
      }
      for (const p of parts) {
        if (!p.on) continue;
        p.age += dt;
        p.cool = Math.max(0, p.cool - dt);
        const v = p.kind === 2 ? speed * 0.4 : speed;
        p.x += p.vx * v * dt;
        p.z += p.vz * v * dt;
        if (p.x < SWIM.x0 || p.x > SWIM.x1) p.vx *= -1;
        if (p.z < SWIM.z0 || p.z > SWIM.z1) p.vz *= -1;
        p.x = Math.min(SWIM.x1, Math.max(SWIM.x0, p.x));
        p.z = Math.min(SWIM.z1, Math.max(SWIM.z0, p.z));
        // a product fades, and its A and B come back from the pump
        if (p.kind === 2 && p.age > 1.7) {
          Object.assign(p, spawn(0), { on: false });
        }
      }
      for (const a of parts) {
        if (!a.on || a.kind !== 0 || a.cool > 0) continue;
        for (const b of parts) {
          if (!b.on || b.kind !== 1 || b.cool > 0) continue;
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          if (dx * dx + dz * dz > 6.5) continue;
          if (Math.random() < chance) {
            a.kind = 2;
            a.age = 0;
            b.on = false;
            b.kind = 1;
            burst(a.x, a.z, true);
          } else {
            [a.vx, b.vx] = [b.vx, a.vx];
            [a.vz, b.vz] = [b.vz, a.vz];
            a.cool = b.cool = 0.35;
            burst((a.x + b.x) / 2, (a.z + b.z) / 2, false);
          }
          break;
        }
      }
      for (const b of bursts) b.t = Math.min(1, b.t + dt / (b.big ? 0.6 : 0.3));
    }
    // a still frame for reduced motion
    if (reduce) {
      for (let i = 0; i < 40; i++) step(0.05);
      draw();
      return;
    }
    let frame = 0;
    let last = performance.now();
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => (visible = !!entry?.isIntersecting));
    if (svg.current) observer.observe(svg.current);
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible) {
        step(dt);
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  // the basket rides its rod down into the liquid, or up out of it
  useEffect(() => {
    const el = basketGroup.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.style.transition = reduce ? "none" : "transform 450ms cubic-bezier(0.77, 0, 0.175, 1)";
    el.style.transform = mix.catalyst ? "translateY(0px)" : `translateY(${basketLift}px)`;
  }, [mix.catalyst, basketLift]);

  function choose(index: number) {
    const next = CHALLENGES[index]!;
    setActive(index);
    setMix({ temp: 300, conc: 1, catalyst: false, ...next.lock });
    setGuess(null);
    setRevealed(false);
    setFeedback(null);
  }
  const set = (patch: Partial<Mix>) => {
    setMix((m) => ({ ...m, ...patch }));
    setFeedback(null);
  };
  const setTemp = (temp: number) => !locked.temp && set({ temp: snap(temp, TEMP.step, TEMP.min, TEMP.max) });
  const setConc = (conc: number) => !locked.conc && set({ conc: snap(conc, CONC.step, CONC.min, CONC.max) });
  const toggleCatalyst = () => {
    if (locked.catalyst) return;
    set({ catalyst: !mix.catalyst });
    setTouched((t) => ({ ...t, basket: true }));
  };

  function react() {
    if (measuring) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMeasuring(true);
    window.setTimeout(
      () => {
        setMeasuring(false);
        const verdict = judge(challenge.id, mix);
        const from = pagePoint(svg.current, GAUGE_CENTER, SIZE);
        if (challenge.id === "katalis-tetap") {
          setRevealed(true);
          void win("katalis-tetap", guess === "tetap" ? `Tebakanmu benar: ${verdict.text}` : `Ternyata tidak habis: ${verdict.text}`, from);
          return;
        }
        if (verdict.ok) void win(challenge.id, verdict.text, from);
        else miss(verdict.text);
      },
      reduce ? 0 : 1400,
    );
  }

  // ---- dragging the knob (turns) and the plunger (slides) ----

  const dragKnob = (event: PointerEvent) => {
    if (locked.temp || !(event.buttons & 1)) return;
    const p = viewPoint(svg.current, event.clientX, event.clientY);
    if (!p) return;
    const [a, b] = inPlane(p, KNOB_AXES.origin, KNOB_AXES.ex, KNOB_AXES.ez);
    const angle = Math.max(-KNOB_SWEEP, Math.min(KNOB_SWEEP, (Math.atan2(a, b) * 180) / Math.PI));
    setTemp(TEMP.min + ((angle + KNOB_SWEEP) / (2 * KNOB_SWEEP)) * (TEMP.max - TEMP.min));
    setTouched((t) => ({ ...t, knob: true }));
  };
  const dragPlunger = (event: PointerEvent) => {
    if (locked.conc || !(event.buttons & 1)) return;
    const p = viewPoint(svg.current, event.clientX, event.clientY);
    if (!p) return;
    const { origin, ex } = PLUNGER_AXIS;
    const x = ((p[0] - origin[0]) * ex[0] + (p[1] - origin[1]) * ex[1]) / (ex[0] * ex[0] + ex[1] * ex[1]);
    setConc(concAtThumb(x));
    setTouched((t) => ({ ...t, plunger: true }));
  };
  const keyStep = (event: KeyboardEvent, change: (sign: number) => void) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") change(1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") change(-1);
    else return;
    event.preventDefault();
  };

  const canRun = !challenge.predict || guess !== null;
  const massText = challenge.predict && !revealed ? "? g" : `${fmt(CATALYST_MASS)} g`;

  return (
    <div className={`laju-lab ${labCard}`} data-theme="light">
      <MissionStrip missions={CHALLENGES} active={active} done={done} story={challenge.story} onChoose={choose} />

      <div className="relative">
        <svg ref={svg} className="iso-svg touch-none select-none" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Reaktor tumbukan. Suhu ${mix.temp} kelvin, konsentrasi ${fmt(mix.conc, 2)} molar, ${mix.catalyst ? "pakai" : "tanpa"} katalis. Laju ${fmt(rate)} kali.`}>
          <defs>
            <radialGradient id="lj-glow">
              <stop offset="0%" stopColor="#4bd29f" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#4bd29f" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="lj-heat">
              <stop offset="0%" stopColor="#ff7a2f" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ff7a2f" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* bench */}
          <path className="iso-halo" d={BENCH_ART.halo} />
          {BENCH_ART.feet.map((foot, i) => <Solid key={i} paths={foot} tone="lo" />)}
          <Solid paths={BENCH_ART.slab} tone="mid" />
          <Line d={BENCH_ART.groove} tone="faint" />
          <Dots points={BENCH_ART.screws} size={0.55} tone="mid" />
          <Line d={BENCH_ART.screwRings} tone="faint" />
          <Solid paths={BENCH_ART.label} tone="mid" />
          <Line d={BENCH_ART.labelRules} tone="faint" />

          {/* syringe stand behind the barrel */}
          <Solid paths={SYRINGE_ART.foot} tone="mid" />
          <Solid paths={SYRINGE_ART.post} tone="mid" />

          {/* gauge post and probe cable */}
          <Solid paths={GAUGE_ART.foot} tone="mid" />
          <Solid paths={GAUGE_ART.post} tone="mid" />

          {/* hot plate with its glowing coil */}
          <Solid paths={PLATE_ART.body} tone="mid" />
          <Line d={PLATE_ART.top} tone="faint" />
          <path d={PLATE_ART.coil} fill="none" stroke="#ff7a2f" strokeWidth={1.2} strokeOpacity={0.25 + glow * 0.75} />
          <Line d={PLATE_ART.vents} tone="lo" />
          <circle cx={PLATE_ART.lamp[0]} cy={PLATE_ART.lamp[1]} r={1.3} fill={glow > 0 ? "#ff7a2f" : "#d6d3e0"} stroke="var(--anatomy-lo)" strokeWidth={0.4} />
          <Line d={PLATE_ART.dial} tone={hot ? "red" : "mid"} />
          <path className="iso-fill" d={PLATE_ART.knobBack} />
          <Line d={PLATE_ART.knobBack} tone="mid" />

          {/* the glass: back panes, then the liquid, the parts inside and the particles */}
          <path d={GLASS_ART.back} fill="#eef5fb" fillOpacity={0.7} />
          <path d={GLASS_ART.side} fill="#e6f0f8" fillOpacity={0.7} />
          <Line d={GLASS_ART.hiddenEdges} tone="faint" />
          <path d={GLASS_ART.liquidBack} fill="#cfe6f5" fillOpacity={0.55} />
          <path d={GLASS_ART.liquidTop} fill="#bfe0f2" fillOpacity={0.7} stroke="#9cc9e4" strokeWidth={0.4} />
          {/* the coil heats the liquid from below */}
          <ellipse cx={(at([2, 0, 9])[0] + at([58, 0, 9])[0]) / 2} cy={at([30, 0, 12])[1]} rx={70} ry={10} fill="url(#lj-heat)" opacity={glow * 0.45} />
          <Solid paths={THERMO_ART.inside} tone="mid" />
          <path className="iso-fill" d={THERMO_ART.bulb} />
          <path d={THERMO_ART.bulb} fill="#e5484d" stroke="var(--anatomy-mid)" strokeWidth={0.4} />
          <path d={column.inside} stroke="#e5484d" strokeWidth={1.1} />

          <g ref={basketGroup}>
            <Solid paths={basket.body} tone="mid" crease="none" />
            <Line d={basket.mesh} tone="faint" />
            <Line d={basket.rim} tone="mid" />
            {basket.pellets.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={1.3} fill="#4f4a63" stroke="#fff" strokeWidth={0.3} />
            ))}
            <path d={basket.rod} stroke="var(--anatomy-mid)" strokeWidth={0.9} />
            <g
              role="switch"
              tabIndex={locked.catalyst ? -1 : 0}
              aria-label="Keranjang katalis"
              aria-checked={mix.catalyst}
              aria-disabled={locked.catalyst}
              className={locked.catalyst ? "" : "parabola-handle cursor-pointer"}
              onClick={toggleCatalyst}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                toggleCatalyst();
              }}
            >
              {!locked.catalyst ? <circle cx={basket.grip[0]} cy={basket.grip[1]} r={12} fill="url(#lj-glow)" className={touched.basket ? "" : "parabola-breathe"} /> : null}
              <circle cx={basket.grip[0]} cy={basket.grip[1]} r={3.2} fill={locked.catalyst ? "#ece9f6" : "#4bd29f"} stroke={locked.catalyst ? "var(--anatomy-mid)" : "#0f6b4a"} strokeWidth={0.8} />
            </g>
          </g>

          {Array.from({ length: POOL }, (_, i) => (
            <circle key={i} ref={(el) => void (dots.current[i] = el)} r={0} stroke="#fff" strokeWidth={0.4} />
          ))}
          {Array.from({ length: FLASHES }, (_, i) => (
            <g key={i} ref={(el) => void (flashes.current[i] = el)} opacity={0} className="laju-flash">
              <circle r={2.4} fill="none" stroke="#f5b400" strokeWidth={0.8} />
              <path d="M-4 0L4 0M0 -4L0 4M-2.8 -2.8L2.8 2.8M-2.8 2.8L2.8 -2.8" stroke="#f5b400" strokeWidth={0.6} strokeLinecap="round" />
            </g>
          ))}

          <path d={GLASS_ART.liquidFront} fill="#cfe6f5" fillOpacity={0.18} />
          <path d={GLASS_ART.meniscus} stroke="#8fc0de" strokeWidth={0.6} />
          <Line d={GLASS_ART.frontEdges} tone="mid" />
          <Line d={GLASS_ART.shine} tone="faint" />
          <Line d={GLASS_ART.marks} tone="lo" />

          {/* lid with its three ports, the thermometer above, the probe cable to the gauge */}
          <Solid paths={GLASS_ART.lid} tone="hi" />
          <Dots points={GLASS_ART.lidScrews} size={0.5} tone="mid" />
          {GLASS_ART.ports.map((port, i) => <Solid key={i} paths={port} tone="mid" />)}
          <Solid paths={THERMO_ART.outside} tone="hi" />
          <path d={column.outside} stroke="#e5484d" strokeWidth={1.1} strokeLinecap="round" />
          <Line d={THERMO_ART.ticks} tone="mid" />
          <Solid paths={THERMO_ART.cap} tone="mid" />
          {challenge.id === "cepat-tapi-aman" ? <path d={thermoMark(SAFE_TEMP)} stroke="#e5484d" strokeWidth={0.9} strokeDasharray="1.6 1.2" /> : null}
          <path d={GAUGE_ART.cable} fill="none" stroke="var(--anatomy-lo)" strokeWidth={0.9} />
          <Dots points={GAUGE_ART.cableEnds} size={0.7} tone="mid" />

          {/* the syringe pump: barrel, stock solution, seal, plunger, tube to the lid */}
          <Solid paths={SYRINGE_ART.clamp} tone="mid" />
          <path d={SYRINGE_ART.barrelBody} fill="#f3f8fc" fillOpacity={0.85} />
          <path d={syringe.stock} fill="#f6b8bb" fillOpacity={0.8} />
          <path d={SYRINGE_ART.barrelSides} stroke="var(--anatomy-mid)" strokeWidth={0.6} />
          <path d={SYRINGE_ART.barrelFront} fill="none" stroke="var(--anatomy-mid)" strokeWidth={0.6} />
          <path className="iso-fill" d={SYRINGE_ART.flange} />
          <Line d={SYRINGE_ART.flange} tone="mid" />
          <path d={SYRINGE_ART.barrelBack} fill="none" stroke="var(--anatomy-mid)" strokeWidth={0.6} />
          <Line d={SYRINGE_ART.ticks} tone="lo" />
          <path d={syringe.seal} fill="#4f4a63" />
          <path d={syringe.rod} stroke="var(--anatomy-hi)" strokeWidth={1.4} />
          <path d={SYRINGE_ART.nozzle} stroke="var(--anatomy-mid)" strokeWidth={1.4} />
          <path d={SYRINGE_ART.tube} fill="none" stroke="#f6b8bb" strokeWidth={1.6} strokeLinejoin="round" />
          <path d={SYRINGE_ART.tube} fill="none" stroke="var(--anatomy-lo)" strokeWidth={0.4} strokeLinejoin="round" />

          {/* the gauge */}
          <path className="iso-fill" d={GAUGE_ART.case} />
          <Line d={GAUGE_ART.case} tone="mid" />
          <path className="iso-fill" d={GAUGE_ART.bezel} />
          <Line d={GAUGE_ART.bezel} tone="hi" />
          <path d={GAUGE_ART.face} fill="#ffffff" stroke="var(--anatomy-lo)" strokeWidth={0.5} />
          {band ? <path d={band} fill="#4bd29f" fillOpacity={0.35} /> : null}
          <Line d={GAUGE_ART.arc} tone="lo" />
          <Line d={GAUGE_ART.ticks} tone="mid" />
          <Dots points={GAUGE_ART.screws} size={0.55} tone="mid" />
          <path d={needle.needle} stroke="#e5484d" strokeWidth={1.2} strokeLinecap="round" style={{ transition: "d 300ms cubic-bezier(0.23, 1, 0.32, 1)" }} />
          <path className="iso-fill" d={GAUGE_ART.hub} />
          <Line d={GAUGE_ART.hub} tone="hi" />

          {/* handles: knob, plunger thumb, basket rod */}
          <g
            role="slider"
            tabIndex={locked.temp ? -1 : 0}
            aria-label="Pemanas (suhu)"
            aria-valuemin={TEMP.min}
            aria-valuemax={TEMP.max}
            aria-valuenow={mix.temp}
            aria-valuetext={`${mix.temp} kelvin`}
            aria-disabled={locked.temp}
            className={locked.temp ? "" : "parabola-handle cursor-grab active:cursor-grabbing"}
            onPointerDown={(event) => {
              if (locked.temp) return;
              (event.currentTarget as Element).setPointerCapture(event.pointerId);
              dragKnob(event);
            }}
            onPointerMove={dragKnob}
            onKeyDown={(event) => !locked.temp && keyStep(event, (sign) => (setTemp(mix.temp + sign * TEMP.step), setTouched((t) => ({ ...t, knob: true }))))}
          >
            {!locked.temp ? <circle cx={KNOB_AXES.origin[0]} cy={KNOB_AXES.origin[1]} r={14} fill="url(#lj-glow)" className={touched.knob ? "" : "parabola-breathe"} /> : null}
            <path d={PLATE_ART.knobFace} fill={locked.temp ? "#ece9f6" : "#4bd29f"} stroke={locked.temp ? "var(--anatomy-mid)" : "#0f6b4a"} strokeWidth={0.8} />
            <path d={PLATE_ART.knobKnurl} stroke={locked.temp ? "var(--anatomy-lo)" : "#0f6b4a"} strokeWidth={0.4} />
            <path d={knob.pointer} stroke={locked.temp ? "var(--anatomy-hi)" : "#04352a"} strokeWidth={1.1} strokeLinecap="round" />
          </g>
          <g
            role="slider"
            tabIndex={locked.conc ? -1 : 0}
            aria-label="Pompa (konsentrasi)"
            aria-valuemin={CONC.min}
            aria-valuemax={CONC.max}
            aria-valuenow={mix.conc}
            aria-valuetext={`${fmt(mix.conc, 2)} molar`}
            aria-disabled={locked.conc}
            className={locked.conc ? "" : "parabola-handle cursor-grab active:cursor-grabbing"}
            onPointerDown={(event) => {
              if (locked.conc) return;
              (event.currentTarget as Element).setPointerCapture(event.pointerId);
              dragPlunger(event);
            }}
            onPointerMove={dragPlunger}
            onKeyDown={(event) => !locked.conc && keyStep(event, (sign) => (setConc(mix.conc + sign * CONC.step), setTouched((t) => ({ ...t, plunger: true }))))}
          >
            {!locked.conc ? <circle cx={syringe.grip[0]} cy={syringe.grip[1]} r={14} fill="url(#lj-glow)" className={touched.plunger ? "" : "parabola-breathe"} /> : null}
            <path d={syringe.thumbBack} fill={locked.conc ? "#d9d5e6" : "#2fb383"} />
            <path d={syringe.thumb} fill={locked.conc ? "#ece9f6" : "#4bd29f"} stroke={locked.conc ? "var(--anatomy-mid)" : "#0f6b4a"} strokeWidth={0.8} />
          </g>
        </svg>

        {/* floating values */}
        <Float at={KNOB_AXES.origin} size={SIZE} dx={38} tone={locked.temp ? "locked" : hot ? "bad" : "handle"}>
          {mix.temp} K
        </Float>
        <Float at={syringe.grip} size={SIZE} dy={-17} tone={locked.conc ? "locked" : "handle"}>
          {fmt(mix.conc, 2)} M
        </Float>
        <Float at={mix.catalyst ? basket.grip : [basket.grip[0], basket.grip[1] + basketLift]} size={SIZE} dx={-38} tone={locked.catalyst ? "locked" : "handle"}>
          {mix.catalyst ? "katalis masuk" : "katalis"}
        </Float>
        <Float at={mix.catalyst ? basket.label : [basket.label[0], basket.label[1] + basketLift]} size={SIZE} dx={-22} tone={revealed ? "good" : "plain"}>
          {massText}
        </Float>
        {challenge.id === "cepat-tapi-aman" ? (
          <Float at={thermoMarkAt(SAFE_TEMP)} size={SIZE} dx={30} tone={hot ? "bad" : "plain"}>
            maks {SAFE_TEMP} K
          </Float>
        ) : null}
        <Float at={GAUGE_READOUT} size={SIZE} tone="dark">
          {fmt(rate)}×
        </Float>
        <div className="hidden sm:contents">
          {GAUGE_ART.labels.map((label) => (
            <Float key={label.octave} at={label.at} size={SIZE} tone="ghost">
              {label.octave === -2 ? "¼" : label.octave === -1 ? "½" : 2 ** label.octave}
            </Float>
          ))}
        </div>
        {!touched.knob && !locked.temp ? (
          <Float at={KNOB_AXES.origin} size={SIZE} dx={-34} tone="hint">
            putar
          </Float>
        ) : null}
        {!touched.plunger && !locked.conc ? (
          <Float at={syringe.grip} size={SIZE} dy={18} tone="hint">
            tekan
          </Float>
        ) : null}

        {/* why it changes: the energy hill, and how rare a hard enough hit is */}
        <div className="pointer-events-none absolute right-2 top-2 hidden w-[170px] rounded-[14px] bg-white/90 p-2 ring-1 ring-[#e9e4f8] sm:block" aria-hidden="true">
          <svg viewBox="0 0 150 64" className="block w-full">
            <path d="M6 46 C40 46 46 6 75 6 C104 6 110 54 144 54" fill="none" stroke={mix.catalyst ? "#c9c4dc" : "#18153a"} strokeWidth={1.6} strokeDasharray={mix.catalyst ? "3 3" : undefined} />
            {mix.catalyst ? <path d="M6 46 C40 46 50 22 75 22 C100 22 110 54 144 54" fill="none" stroke="#14a06f" strokeWidth={1.8} /> : null}
            <path d={`M75 46 L75 ${mix.catalyst ? 22 : 6}`} stroke="#e5484d" strokeWidth={1} strokeDasharray="2 2" />
            <text x="80" y={mix.catalyst ? 36 : 28} fontSize="9" fontWeight="700" fill="#e5484d">
              Ea {fmt((mix.catalyst ? EA_CATALYST : EA) / 1000)} kJ
            </text>
            <text x="6" y="60" fontSize="8" fill="#8a8a8f">
              A + B
            </text>
            <text x="144" y="63" fontSize="8" fill="#8a8a8f" textAnchor="end">
              produk
            </text>
          </svg>
          <p className="mt-1 text-[10.5px] font-semibold leading-tight text-[#18153a]">
            <span className="text-[#c98a00]">✦</span> cukup energi: 1 dari {oneIn(effectiveShare(mix))}
          </p>
        </div>
        <span className="sr-only" aria-live="polite">{`Laju ${fmt(rate)} kali`}</span>
      </div>

      {/* phone: the same controls at full size */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#efebf9] px-3 py-2.5 sm:hidden">
        <PhoneSlider label="Suhu" value={mix.temp} min={TEMP.min} max={TEMP.max} step={TEMP.step} unit=" K" locked={locked.temp} onChange={setTemp} />
        <PhoneSlider label="Konsentrasi" value={mix.conc} min={CONC.min} max={CONC.max} step={CONC.step} unit=" M" digits={2} locked={locked.conc} onChange={setConc} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#efebf9] px-3 py-2.5 sm:px-4">
        {challenge.predict ? (
          <ChoiceChips
            label="Tebakanmu"
            options={[
              ["habis", "Habis terpakai"],
              ["tetap", "Tetap utuh"],
            ]}
            value={guess}
            disabled={revealed}
            onChange={setGuess}
          />
        ) : (
          <ChoiceChips
            label="Katalis"
            options={[
              ["tanpa", "Tanpa katalis"],
              ["pakai", "Pakai katalis"],
            ]}
            value={mix.catalyst ? "pakai" : "tanpa"}
            disabled={locked.catalyst}
            onChange={(value) => value === "pakai" !== mix.catalyst && toggleCatalyst()}
          />
        )}
        <span className="flex-1" />
        <FeedbackPill feedback={feedback} />
        <ActionButton onClick={react} disabled={!canRun || measuring}>
          <span className="flex items-center gap-1.5">
            <FlaskConical className={measuring ? "size-4 animate-pulse" : "size-4"} aria-hidden="true" /> {measuring ? "Mengukur…" : "Reaksikan"}
          </span>
        </ActionButton>
      </div>
    </div>
  );
}

import { Check, Flame, Lock, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { announcePoints, flyCoin, HAPTIC, haptic, playSound } from "~/features/game-feel";
import { cn } from "~/lib/utils";

import "./iso/iso.css";
import { Dots, Line, Solid } from "./iso/react/draw";
import { useLabState } from "./lab-ui";
import { LabPointer } from "./lab-pointer";
import {
  ANGLE,
  BALL_RADIUS,
  CHALLENGES,
  fmt,
  flightOf,
  hits,
  missHint,
  partnerAngle,
  positionAt,
  SPEED,
  TWO_ANGLES_APART,
  type ChallengeId,
  type Mass,
  type Shot,
} from "./parabola/model";
import {
  at,
  BASE_ART,
  barrelAt,
  CANNON_ART,
  CART_ART,
  CLIFF_ART,
  FIELD_ART,
  flight,
  ground,
  HEIGHT,
  handleAt,
  P,
  pointerAt,
  POWDER_ART,
  POWDER_AXIS,
  powderHandleAt,
  QUAD_AXES,
  QUADRANT,
  RACK,
  RAIL_ART,
  RAIL_Y,
  targetAt,
  U,
  WIDTH,
} from "./parabola/scene";

// Lab "Gerak parabola" (Fisika SMA). A cannon on a cliff, drawn as a small
// machine with the anatomy kit: the angle is set by a handle on the elevation
// quadrant, the launch speed by the charge handle on the powder column, and the
// ball is picked from the rack. While the ball flies, a cart on the rail below
// keeps exactly under it (the horizontal speed never changes) and a drop line
// shows its height. Every number on screen comes from parabola/model.ts.

type Phase = "aim" | "flying" | "landed";
type Feedback = { ok: boolean; text: string; points?: number } | null;
type Prediction = "berat" | "sama" | "ringan";

// Kept a little inside the card, so a tag near an edge is never cut off.
const pct = ([x, y]: [number, number]) => ({ left: `${Math.min(93, Math.max(7, (x / WIDTH) * 100))}%`, top: `${(y / HEIGHT) * 100}%` });
const ballPx = (mass: Mass) => BALL_RADIUS[mass] * U * P.scale;
const speedToT = (speed: number) => (speed - SPEED.min) / (SPEED.max - SPEED.min);
const tToSpeed = (t: number) => Math.round((SPEED.min + Math.min(1, Math.max(0, t)) * (SPEED.max - SPEED.min)) * 2) / 2;
const clampAngle = (a: number) => Math.min(ANGLE.max, Math.max(ANGLE.min, Math.round(a)));

export function ParabolaLab({ solved, onSolve, onState }: { solved: string[]; onSolve: (challenge: ChallengeId) => Promise<number>; onState?: (summary: string) => void }) {
  const firstOpen = CHALLENGES.findIndex((challenge) => !solved.includes(challenge.id));
  const [active, setActive] = useState(firstOpen === -1 ? 0 : firstOpen);
  const challenge = CHALLENGES[active]!;
  const [angle, setAngle] = useState(challenge.lock?.angle ?? 35);
  const [speed, setSpeed] = useState(challenge.lock?.speed ?? 14);
  const [mass, setMass] = useState<Mass>(1);
  const [phase, setPhase] = useState<Phase>("aim");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [done, setDone] = useState<string[]>(solved);
  const [traces, setTraces] = useState<Array<{ shot: Shot; d: string }>>([]);
  const [hitAngles, setHitAngles] = useState<number[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [firedMasses, setFiredMasses] = useState<Mass[]>([]);
  const [touched, setTouched] = useState({ angle: false, speed: false });
  const [landing, setLanding] = useState<{ x: number; range: number; hit: boolean } | null>(null);
  useLabState(onState, [
    `Misi ${active + 1} dari ${CHALLENGES.length} (${challenge.id}): ${challenge.story}`,
    `Sudut laras ${angle}°, kecepatan awal ${speed} m/s, bola ${mass} kg`,
    challenge.id === "berat-ringan" && `Tebakan siswa: ${prediction ?? "belum menebak"}; bola yang sudah ditembakkan: ${firedMasses.join(" dan ") || "belum ada"} kg`,
    landing && `Tembakan terakhir mendarat ${fmt(landing.range)} m dari tebing${landing.hit ? ", mengenai bendera" : ""}`,
    feedback && `Umpan balik lab: ${feedback.text}`,
    `Sudah selesai: ${done.length ? done.join(", ") : "belum ada"}`,
  ]);

  const svg = useRef<SVGSVGElement>(null);
  const ball = useRef<SVGGElement>(null);
  const trace = useRef<SVGPathElement>(null);
  const cart = useRef<SVGGElement>(null);
  const drop = useRef<SVGPathElement>(null);
  const groundLink = useRef<SVGPathElement>(null);
  const shadow = useRef<SVGEllipseElement>(null);
  const tagBall = useRef<HTMLDivElement>(null);
  const tagCart = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const locked = { angle: challenge.lock?.angle !== undefined, speed: challenge.lock?.speed !== undefined };
  const barrel = useMemo(() => barrelAt(angle), [angle]);
  const target = useMemo(() => targetAt(challenge.target), [challenge.target]);
  const shot: Shot = { angle, speed, mass };
  const preview = flightOf(shot);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function choose(index: number) {
    cancelAnimationFrame(frame.current);
    const next = CHALLENGES[index]!;
    setActive(index);
    setAngle(next.lock?.angle ?? 35);
    setSpeed(next.lock?.speed ?? 14);
    setMass(1);
    setPhase("aim");
    setFeedback(null);
    setTraces([]);
    setHitAngles([]);
    setPrediction(null);
    setFiredMasses([]);
    setLanding(null);
    placeBall(null);
  }

  /** Puts the ball, its drop line, the cart and the two tags at a point of the flight (or back in the barrel). */
  function placeBall(state: { x: number; y: number; vx: number; vy: number; time: number } | null, upTo?: { shot: Shot; t: number }) {
    const muzzle = barrelAt(angle).muzzle;
    const [bx, by] = state ? flight(state.x, state.y) : muzzle;
    ball.current?.setAttribute("transform", `translate(${bx.toFixed(1)} ${by.toFixed(1)})`);
    const flying = Boolean(state);
    const cartX = state ? Math.max(0, state.x) : 0;
    const [cx, cy] = at([cartX * U, 0, 0]);
    const [ox, oy] = at([0, 0, 0]);
    cart.current?.setAttribute("transform", `translate(${(cx - ox).toFixed(1)} ${(cy - oy).toFixed(1)})`);
    if (drop.current) drop.current.setAttribute("d", state && state.x > 0 ? `M${bx.toFixed(1)} ${by.toFixed(1)}L${ground(state.x)[0].toFixed(1)} ${ground(state.x)[1].toFixed(1)}` : "");
    if (groundLink.current) groundLink.current.setAttribute("d", state && state.x > 0 ? `M${ground(state.x)[0].toFixed(1)} ${ground(state.x)[1].toFixed(1)}L${ground(state.x, RAIL_Y)[0].toFixed(1)} ${ground(state.x, RAIL_Y)[1].toFixed(1)}` : "");
    if (shadow.current) {
      const [sx, sy] = ground(state ? Math.max(0, state.x) : 0);
      shadow.current.setAttribute("cx", sx.toFixed(1));
      shadow.current.setAttribute("cy", sy.toFixed(1));
      shadow.current.style.opacity = state && state.x > 0 ? "0.5" : "0";
    }
    if (trace.current && upTo) trace.current.setAttribute("d", pathD(upTo.shot, upTo.t));
    if (!flying && trace.current) trace.current.setAttribute("d", "");
    if (tagBall.current) {
      tagBall.current.style.opacity = state ? "1" : "0";
      Object.assign(tagBall.current.style, pct([bx, by]));
      if (state) tagBall.current.textContent = `t ${fmt(state.time)} s · tinggi ${fmt(state.y)} m`;
    }
    if (tagCart.current) {
      const [tx, ty] = at([cartX * U, RAIL_Y, 14]);
      tagCart.current.style.opacity = state && state.x > 0 ? "1" : "0";
      Object.assign(tagCart.current.style, pct([tx, ty]));
      if (state) tagCart.current.textContent = `vx ${fmt(state.vx)} m/s · tetap`;
    }
  }

  useEffect(() => {
    if (phase === "aim") placeBall(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle, phase]);

  async function land(fired: Shot) {
    setPhase("landed");
    // the landing mark takes over from the flight tags
    if (tagBall.current) tagBall.current.style.opacity = "0";
    if (tagCart.current) tagCart.current.style.opacity = "0";
    const f = flightOf(fired);
    const hit = hits(fired, challenge.target);
    setLanding({ x: Math.min(f.range, 52), range: f.range, hit });
    setTraces((list) => [...list.slice(-2), { shot: fired, d: pathD(fired, Infinity) }]);
    let solvedNow = false;
    let text = "";
    if (challenge.id === "kenai-benteng") {
      solvedNow = hit;
      text = hit ? "Tepat kena benteng!" : missHint(fired, challenge.target).text;
    } else if (challenge.id === "dua-sudut") {
      if (hit) {
        const before = hitAngles.find((a) => Math.abs(a - fired.angle) >= TWO_ANGLES_APART);
        setHitAngles((list) => [...list, fired.angle]);
        solvedNow = before !== undefined;
        const other = partnerAngle(fired);
        text = solvedNow ? `Dua sudut, satu titik: ${before}° dan ${fired.angle}°` : other ? `Kena di ${fired.angle}°. Ada sudut lain yang juga kena…` : `Kena di ${fired.angle}°. Coba sudut yang jauh berbeda`;
      } else text = missHint(fired, challenge.target).text;
    } else {
      const fired2 = [...new Set([...firedMasses, fired.mass])] as Mass[];
      setFiredMasses(fired2);
      if (fired2.length < 2) text = `Bola ${fired.mass} kg mendarat di ${fmt(f.range)} m. Sekarang tembak bola ${fired.mass === 1 ? 5 : 1} kg`;
      else {
        solvedNow = true;
        text = prediction === "sama" ? "Tebakanmu benar: sama jauh!" : "Ternyata sama jauh: massa tidak mengubah lintasan";
      }
    }
    if (!solvedNow) {
      playSound(hit ? "small" : "bonk");
      haptic(HAPTIC.tap);
      setFeedback({ ok: hit, text });
      return;
    }
    playSound("small");
    haptic(HAPTIC.award);
    setFeedback({ ok: true, text });
    if (!done.includes(challenge.id)) {
      setDone((list) => [...list, challenge.id]);
      try {
        const points = await onSolve(challenge.id);
        setFeedback({ ok: true, text, points });
        if (points > 0 && svg.current) {
          const box = svg.current.getBoundingClientRect();
          const [lx, ly] = ground(Math.min(f.range, 50));
          flyCoin({ x: box.left + (lx / WIDTH) * box.width, y: box.top + (ly / HEIGHT) * box.height });
          window.setTimeout(() => announcePoints(points), 800);
        }
      } catch {
        setFeedback({ ok: true, text: `${text} (poin belum tersimpan)` });
      }
    }
  }

  function fire() {
    if (phase === "flying") return;
    if (challenge.id === "berat-ringan" && !prediction) {
      setFeedback({ ok: false, text: "Tebak dulu, baru tembak" });
      return;
    }
    const fired: Shot = { angle, speed, mass };
    setFeedback(null);
    setLanding(null);
    setPhase("flying");
    playSound("whoosh");
    haptic(HAPTIC.tap);
    const f = flightOf(fired);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      placeBall(positionAt(fired, f.time), { shot: fired, t: f.time });
      void land(fired);
      return;
    }
    const start = performance.now();
    // A little slower than real time, so the eye can follow the cart.
    const scale = 0.75;
    const step = (now: number) => {
      const t = ((now - start) / 1000) * scale;
      const state = positionAt(fired, t);
      placeBall(state, { shot: fired, t });
      if (t < f.time) frame.current = requestAnimationFrame(step);
      else void land(fired);
    };
    frame.current = requestAnimationFrame(step);
  }

  function again() {
    setPhase("aim");
    setFeedback(null);
    setLanding(null);
  }

  // ---- the two handles: drag in the drawing, or arrows on the keyboard ----

  const toView = (event: PointerEvent): [number, number] | null => {
    const node = svg.current;
    const matrix = node?.getScreenCTM();
    if (!node || !matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return [point.x, point.y];
  };
  const dragAngle = (event: PointerEvent) => {
    if (locked.angle || phase === "flying" || !(event.buttons & 1)) return;
    const p = toView(event);
    if (!p) return;
    const { origin, ex, ez } = QUAD_AXES;
    const dx = p[0] - origin[0];
    const dy = p[1] - origin[1];
    // solve p - origin = a·ex + b·ez for the flight plane's own x and z
    const det = ex[0] * ez[1] - ex[1] * ez[0];
    const a = (dx * ez[1] - dy * ez[0]) / det;
    const b = (ex[0] * dy - ex[1] * dx) / det;
    setAngle(clampAngle((Math.atan2(b, a) * 180) / Math.PI));
    setTouched((t) => ({ ...t, angle: true }));
    if (phase === "landed") setPhase("aim");
  };
  const dragSpeed = (event: PointerEvent) => {
    if (locked.speed || phase === "flying" || !(event.buttons & 1)) return;
    const p = toView(event);
    if (!p) return;
    const { from, to } = POWDER_AXIS;
    const vx = to[0] - from[0];
    const vy = to[1] - from[1];
    setSpeed(tToSpeed(((p[0] - from[0]) * vx + (p[1] - from[1]) * vy) / (vx * vx + vy * vy)));
    setTouched((t) => ({ ...t, speed: true }));
    if (phase === "landed") setPhase("aim");
  };
  const keyAngle = (event: KeyboardEvent) => {
    if (locked.angle || phase === "flying") return;
    const delta = event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : event.key === "ArrowDown" || event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    setAngle((a) => clampAngle(a + delta * (event.shiftKey ? 5 : 1)));
    setTouched((t) => ({ ...t, angle: true }));
    if (phase === "landed") setPhase("aim");
  };
  const keySpeed = (event: KeyboardEvent) => {
    if (locked.speed || phase === "flying") return;
    const delta = event.key === "ArrowUp" || event.key === "ArrowRight" ? 0.5 : event.key === "ArrowDown" || event.key === "ArrowLeft" ? -0.5 : 0;
    if (!delta) return;
    event.preventDefault();
    setSpeed((s) => Math.min(SPEED.max, Math.max(SPEED.min, s + delta * (event.shiftKey ? 4 : 1))));
    setTouched((t) => ({ ...t, speed: true }));
    if (phase === "landed") setPhase("aim");
  };

  const angleHandle = handleAt(angle);
  const speedHandle = powderHandleAt(speedToT(speed));
  const loaded = RACK.cups.find((cup) => cup.mass === mass)!;
  const canFire = phase !== "flying" && !(challenge.id === "berat-ringan" && !prediction);

  return (
    <div className="parabola-lab iso relative overflow-hidden rounded-[22px] border border-[#e9e4f8] bg-[#fbfaf7]" data-theme="light">
      {/* mission strip: which of the three, and the one-line story */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#efebf9] px-3 py-2.5 sm:px-4">
        <div className="flex gap-1.5" role="tablist" aria-label="Misi">
          {CHALLENGES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Misi ${index + 1}${done.includes(item.id) ? ", selesai" : ""}`}
              onClick={() => choose(index)}
              className={cn(
                "grid size-8 place-items-center rounded-full text-sm font-bold transition-transform duration-150 active:scale-[0.94]",
                index === active ? "bg-[#18153a] text-white" : done.includes(item.id) ? "bg-[#e6f8f0] text-[#14704b]" : "bg-white text-[#18153a] ring-1 ring-[#e4def8]",
              )}
            >
              {done.includes(item.id) ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </button>
          ))}
        </div>
        <p className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-[#18153a]">{challenge.story}</p>
      </div>

      <div className="relative">
        <svg ref={svg} className="iso-svg touch-none select-none" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Meriam di tebing. Sudut ${angle} derajat, kecepatan ${fmt(speed)} meter per detik, bola ${mass} kilogram.`}>
          <defs>
            <radialGradient id="pb-ball" cx="35%" cy="32%" r="70%">
              <stop offset="0%" stopColor="#6d6a8c" />
              <stop offset="55%" stopColor="#2a2747" />
              <stop offset="100%" stopColor="#15132b" />
            </radialGradient>
            <radialGradient id="pb-glow">
              <stop offset="0%" stopColor="#4bd29f" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#4bd29f" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* base board */}
          <path className="iso-halo" d={BASE_ART.halo} />
          {BASE_ART.feet.map((foot, i) => <Solid key={`f${i}`} paths={foot} tone="lo" />)}
          <Solid paths={BASE_ART.slab} tone="mid" />
          <Line d={BASE_ART.groove} tone="faint" />
          <Dots points={BASE_ART.screws} size={0.55} tone="mid" />
          <Line d={BASE_ART.screwRings} tone="faint" />

          {/* the field: lane, target zone, far pegs */}
          <Line d={FIELD_ART.lane} tone="faint" dashed />
          <path d={target.zone} fill="#4bd29f" fillOpacity={0.12} stroke="none" />
          <Line d={target.rings} tone="mid" />
          {FIELD_ART.pegs.map((peg) => (
            <g key={peg.metres}>
              <Line d={peg.foot} tone="faint" />
              <Solid paths={peg.post} tone="mid" />
              <Solid paths={peg.cap} tone="mid" />
            </g>
          ))}
          <g data-lab-part="bendera">
            <Line d={target.poleFoot} tone="lo" />
            <Line d={target.pole} tone="hi" />
            <path d={target.flag} fill="#e5484d" stroke="#b42f34" strokeWidth={0.6} strokeLinejoin="round" />
          </g>
          <Solid paths={FIELD_ART.endStop} tone="mid" />
          <Dots points={FIELD_ART.endStopScrews} size={0.5} tone="mid" />

          {/* old shots, faint, and the landing mark */}
          {traces.map((item, i) => (
            <path key={i} d={item.d} fill="none" stroke="#5e4ac4" strokeOpacity={0.18 + i * 0.12} strokeWidth={1} strokeDasharray="2 3" strokeLinecap="round" />
          ))}

          {/* the cliff with its height scale, ladder and the gun platform */}
          <Solid paths={CLIFF_ART.rock} tone="hi" />
          <Line d={CLIFF_ART.strata} tone="faint" />
          <Line d={CLIFF_ART.strataSide} tone="faint" />
          <Line d={CLIFF_ART.heightSpine} tone="mid" />
          <Line d={CLIFF_ART.heightScale} tone="mid" />
          <Line d={CLIFF_ART.ladderRails} tone="mid" />
          <Line d={CLIFF_ART.ladderRungs} tone="lo" />
          <Solid paths={CLIFF_ART.platform} tone="mid" />
          <Line d={CLIFF_ART.platformGroove} tone="faint" />
          <Dots points={CLIFF_ART.platformScrews} size={0.45} tone="mid" />

          {/* the shot rack */}
          <g data-lab-part="bola">
            <Solid paths={RACK.board} tone="mid" />
            {RACK.cups.map((cup) => (
              <g key={cup.mass}>
                <Line d={cup.rim} tone="mid" />
                {/* the loaded ball is in the barrel (or in flight): its cup is empty */}
                {cup.mass !== mass ? (
                  <circle cx={cup.center[0]} cy={cup.center[1]} r={ballPx(cup.mass)} fill="url(#pb-ball)" />
                ) : null}
              </g>
            ))}
          </g>

          {/* the powder keg and the charge column */}
          <g data-lab-part="mesiu">
            <Solid paths={POWDER_ART.keg} tone="hi" />
            <Line d={POWDER_ART.kegBands} tone="mid" />
            <Line d={POWDER_ART.kegLid} tone="lo" />
            <Line d={POWDER_ART.fuse} tone="lo" dotted />
            <Solid paths={POWDER_ART.base} tone="mid" />
            <Solid paths={POWDER_ART.column} tone="hi" />
            <Line d={POWDER_ART.slot} tone="lo" />
            <Line d={POWDER_ART.ticks.minor} tone="lo" />
            <Line d={POWDER_ART.ticks.major} tone="mid" />
            <Solid paths={POWDER_ART.cap} tone="mid" />
          </g>

          {/* the cannon: far wheels, far cheek, barrel, near cheek, quadrant, near wheels */}
          {CANNON_ART.wheelsFar.map((wheel, i) => (
            <g key={`wf${i}`}>
              <path className="iso-fill" d={wheel.disc} />
              <Line d={wheel.disc} tone="mid" />
            </g>
          ))}
          <path className="iso-fill" d={CANNON_ART.cheekFar} />
          <Line d={CANNON_ART.cheekFar} tone="mid" />
          <Solid paths={CANNON_ART.trail} tone="mid" />
          <Solid paths={CANNON_ART.bed} tone="mid" />
          <Line d={CANNON_ART.axle} tone="mid" />
          <Line d={CANNON_ART.axle2} tone="mid" />
          <path className="iso-fill" d={CANNON_ART.cheekNear} />
          <Line d={CANNON_ART.cheekNear} tone="hi" />
          <Dots points={CANNON_ART.cheekBolts} size={0.5} tone="mid" />
          {/* the barrel rests on the cheeks: drawn over them */}
          <g className="iso-solid" data-lab-part="laras">
            <path d={barrel.body} fill="#3a365c" stroke="#18153a" strokeWidth={0.7} strokeLinejoin="round" />
            <path d={barrel.shine} stroke="#8f8bb4" strokeWidth={1.2} strokeLinecap="round" fill="none" />
            <path d={barrel.bands} fill="none" stroke="#e0a42c" strokeWidth={0.8} />
            <path d={barrel.bore} fill="#0d0b1f" />
            <circle cx={barrel.cascabel[0]} cy={barrel.cascabel[1]} r={1.4} fill="#3a365c" stroke="#18153a" strokeWidth={0.6} />
          </g>
          <path d={QUADRANT.plate} fill="#f3e3b5" stroke="#b98a2c" strokeWidth={0.6} strokeLinejoin="round" />
          <path d={QUADRANT.arc} fill="none" stroke="#8a6a1e" strokeWidth={0.6} />
          <path d={QUADRANT.ticks} fill="none" stroke="#8a6a1e" strokeWidth={0.5} />
          <path d={pointerAt(angle)} stroke="#18153a" strokeWidth={0.9} strokeLinecap="round" />
          <path className="iso-fill" d={CANNON_ART.trunnionCap} />
          <Line d={CANNON_ART.trunnionCap} tone="hi" />
          {CANNON_ART.wheelsNear.map((wheel, i) => (
            <g key={`wn${i}`}>
              <path className="iso-fill" d={wheel.disc} />
              <Line d={wheel.rim} tone="lo" />
              <Line d={wheel.spokes} tone="mid" />
              <Line d={wheel.disc} tone="hi" />
              <path className="iso-fill" d={wheel.hub} />
              <Line d={wheel.hub} tone="hi" />
            </g>
          ))}

          {/* the rail and the cart that rides under the ball */}
          {RAIL_ART.sleepers.map((sleeper, i) => <Solid key={`s${i}`} paths={sleeper} tone="lo" />)}
          <Solid paths={RAIL_ART.rail} tone="mid" />
          <Line d={RAIL_ART.railTop} tone="faint" />
          <path ref={groundLink} fill="none" stroke="#4bd29f" strokeWidth={0.8} strokeDasharray="1.5 2.5" />
          <g ref={cart} data-lab-part="kereta">
            {CART_ART.wheelsBack.map((wheel, i) => <path key={i} className="iso-fill" d={wheel} stroke="var(--anatomy-mid)" strokeWidth={0.6} />)}
            <Solid paths={CART_ART.body} tone="hi" />
            <Line d={CART_ART.deck} tone="faint" />
            {CART_ART.wheelsFront.map((wheel, i) => <path key={i} className="iso-fill" d={wheel} stroke="var(--anatomy-hi)" strokeWidth={0.6} />)}
            <Dots points={CART_ART.hubs} size={0.5} tone="hi" />
            <path d={CART_ART.mast} stroke="#4bd29f" strokeWidth={1} />
            <circle cx={CART_ART.mastTip[0]} cy={CART_ART.mastTip[1]} r={1.3} fill="#4bd29f" />
          </g>

          {/* the near field: ruler, peg caps in front, label plate */}
          <Solid paths={FIELD_ART.ruler} tone="mid" />
          <Line d={FIELD_ART.rulerMinor} tone="lo" />
          <Line d={FIELD_ART.rulerMajor} tone="mid" />
          <Line d={FIELD_ART.zero} tone="hi" />
          <Solid paths={BASE_ART.label} tone="mid" />
          <Line d={BASE_ART.labelLine} tone="faint" />
          <Line d={BASE_ART.labelRules} tone="lo" free />
          <Dots points={BASE_ART.labelScrews} size={0.45} tone="mid" />

          {/* the flight: shadow, drop line, live trace, ball */}
          <ellipse ref={shadow} rx={3.2} ry={1.1} fill="#18153a" style={{ opacity: 0 }} />
          <path ref={drop} fill="none" stroke="#5e4ac4" strokeWidth={0.8} strokeDasharray="1.5 2.5" />
          <path ref={trace} fill="none" stroke="#5e4ac4" strokeWidth={1.4} strokeLinecap="round" />
          {landing ? (
            <g>
              <circle cx={ground(landing.x)[0]} cy={ground(landing.x)[1]} r={5} fill={landing.hit ? "#4bd29f" : "#e5484d"} fillOpacity={0.25} />
              <circle cx={ground(landing.x)[0]} cy={ground(landing.x)[1]} r={1.6} fill={landing.hit ? "#14704b" : "#b42f34"} />
            </g>
          ) : null}
          <g ref={ball}>
            <circle r={ballPx(mass)} fill="url(#pb-ball)" />
          </g>

          {/* handles: what the student can change glows mint and breathes */}
          {!locked.angle ? (
            <g
              role="slider"
              tabIndex={0}
              aria-label="Sudut tembak"
              aria-valuemin={ANGLE.min}
              aria-valuemax={ANGLE.max}
              aria-valuenow={angle}
              aria-valuetext={`${angle} derajat`}
              className="parabola-handle cursor-grab active:cursor-grabbing"
              onPointerDown={(event) => {
                (event.currentTarget as Element).setPointerCapture(event.pointerId);
                dragAngle(event);
              }}
              onPointerMove={dragAngle}
              onKeyDown={keyAngle}
            >
              <circle cx={angleHandle[0]} cy={angleHandle[1]} r={9} fill="url(#pb-glow)" className={touched.angle ? "" : "parabola-breathe"} />
              <circle cx={angleHandle[0]} cy={angleHandle[1]} r={3.4} fill="#4bd29f" stroke="#0f6b4a" strokeWidth={0.9} />
              <circle cx={angleHandle[0]} cy={angleHandle[1]} r={1.1} fill="#fff" />
            </g>
          ) : null}
          {!locked.speed ? (
            <g
              role="slider"
              tabIndex={0}
              aria-label="Mesiu (kecepatan awal)"
              aria-valuemin={SPEED.min}
              aria-valuemax={SPEED.max}
              aria-valuenow={speed}
              aria-valuetext={`${fmt(speed)} meter per detik`}
              className="parabola-handle cursor-grab active:cursor-grabbing"
              onPointerDown={(event) => {
                (event.currentTarget as Element).setPointerCapture(event.pointerId);
                dragSpeed(event);
              }}
              onPointerMove={dragSpeed}
              onKeyDown={keySpeed}
            >
              <circle cx={speedHandle[0]} cy={speedHandle[1]} r={9} fill="url(#pb-glow)" className={touched.speed ? "" : "parabola-breathe"} />
              <rect x={speedHandle[0] - 4.2} y={speedHandle[1] - 2} width={8.4} height={4} rx={1.6} fill="#4bd29f" stroke="#0f6b4a" strokeWidth={0.9} />
            </g>
          ) : null}
          {phase !== "flying"
            ? RACK.cups.map((cup) => (
                <g
                  key={`pick${cup.mass}`}
                  role="radio"
                  tabIndex={0}
                  aria-checked={cup.mass === mass}
                  aria-label={`Bola ${cup.mass} kilogram`}
                  className="cursor-pointer"
                  onClick={() => {
                    setMass(cup.mass);
                    if (phase === "landed") setPhase("aim");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setMass(cup.mass);
                    }
                  }}
                >
                  <circle cx={cup.center[0]} cy={cup.center[1]} r={ballPx(cup.mass) + 3.2} fill="transparent" stroke="#4bd29f" strokeOpacity={cup.mass === mass ? 0.9 : 0.35} strokeWidth={1} strokeDasharray={cup.mass === mass ? undefined : "2 2"} />
                </g>
              ))
            : null}
        </svg>

        {/* floating values over the drawing */}
        <Float at={handleAt(angle)} dy={-16} tone={locked.angle ? "locked" : "handle"}>
          {locked.angle ? <Lock className="size-3" aria-hidden="true" /> : null}
          {angle}°
        </Float>
        <Float at={powderHandleAt(speedToT(speed))} dy={-18} tone={locked.speed ? "locked" : "handle"}>
          {locked.speed ? <Lock className="size-3" aria-hidden="true" /> : <Flame className="size-3" aria-hidden="true" />}
          {fmt(speed)} m/s
        </Float>
        <Float at={loaded.center} dy={18} dx={-8} tone="plain">
          {mass} kg
        </Float>
        <Float at={target.label} dy={-6} tone="plain">
          {challenge.target} m
        </Float>
        {FIELD_ART.pegs.map((peg) => (
          <Float key={peg.metres} at={peg.label} dy={-2} tone="ghost">
            {peg.metres}
          </Float>
        ))}
        {landing ? (
          <Float at={ground(landing.x)} dy={16} tone={landing.hit ? "good" : "bad"}>
            {fmt(landing.range)} m
          </Float>
        ) : null}
        <div ref={tagBall} className="pointer-events-none absolute -translate-x-1/2 -translate-y-[170%] whitespace-nowrap rounded-full bg-[#18153a]/85 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums opacity-0 transition-opacity duration-150" aria-hidden="true" />
        <div ref={tagCart} className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-[#e6f8f0] px-2 py-0.5 text-[11px] font-semibold text-[#14704b] tabular-nums opacity-0 ring-1 ring-[#4bd29f]/50 transition-opacity duration-150" aria-hidden="true" />

        {/* first-visit hint: where to touch */}
        {!touched.angle && !locked.angle && phase === "aim" ? (
          <Float at={handleAt(angle)} dx={34} dy={2} tone="hint">
            seret
          </Float>
        ) : null}
      </div>

      {/* on a phone the handles are small under a finger: the same controls, full size */}
      <div className="grid grid-cols-[1fr_1fr] gap-x-3 gap-y-2 border-t border-[#efebf9] px-3 py-2.5 sm:hidden">
        <PhoneSlider label="Sudut" value={angle} min={ANGLE.min} max={ANGLE.max} step={1} unit="°" locked={locked.angle || phase === "flying"} onChange={(value) => {
          setAngle(value);
          setTouched((t) => ({ ...t, angle: true }));
          if (phase === "landed") setPhase("aim");
        }} />
        <PhoneSlider label="Mesiu" value={speed} min={SPEED.min} max={SPEED.max} step={0.5} unit=" m/s" locked={locked.speed || phase === "flying"} onChange={(value) => {
          setSpeed(value);
          setTouched((t) => ({ ...t, speed: true }));
          if (phase === "landed") setPhase("aim");
        }} />
        <div className="col-span-2 flex gap-1.5" role="radiogroup" aria-label="Bola">
          {([1, 5] as const).map((value) => (
            <button key={value} type="button" role="radio" aria-checked={mass === value} disabled={phase === "flying"} onClick={() => {
              setMass(value);
              if (phase === "landed") setPhase("aim");
            }} className={cn("flex-1 rounded-full py-1.5 text-[12.5px] font-semibold ring-1", mass === value ? "bg-[#e6f8f0] text-[#14704b] ring-[#4bd29f]" : "bg-white text-[#18153a] ring-[#e4def8]")}>
              Bola {value} kg
            </button>
          ))}
        </div>
      </div>

      {/* bottom bar: prediction (mission 3), feedback and the fire button */}
      <div className="flex flex-wrap items-center gap-2 border-t border-[#efebf9] px-3 py-2.5 sm:px-4">
        {challenge.id === "berat-ringan" ? (
          <div className="flex gap-1.5" role="radiogroup" aria-label="Tebakanmu">
            {(
              [
                ["berat", "5 kg lebih jauh"],
                ["sama", "Sama jauh"],
                ["ringan", "1 kg lebih jauh"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={prediction === value}
                disabled={firedMasses.length > 0}
                onClick={() => setPrediction(value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12.5px] font-semibold ring-1 transition-transform duration-150 active:scale-[0.96] disabled:opacity-60",
                  prediction === value ? "bg-[#18153a] text-white ring-[#18153a]" : "bg-white text-[#18153a] ring-[#e4def8]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[12.5px] text-[#5e5e72] tabular-nums" aria-live="polite">
            jangkauan {fmt(preview.range)} m · puncak {fmt(preview.apex.y)} m
          </span>
        )}
        <span className="flex-1" />
        {feedback ? (
          <span
            role="status"
            className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold", feedback.ok ? "bg-[#e6f8f0] text-[#14704b]" : "bg-[#fdecec] text-[#a5282d]")}
          >
            {feedback.ok ? <Check className="size-3.5" aria-hidden="true" /> : null}
            {feedback.text}
            {feedback.points ? <b className="ml-1">+{feedback.points}</b> : null}
          </span>
        ) : null}
        {phase === "landed" ? (
          <button type="button" onClick={again} aria-label="Bidik ulang" className="grid size-9 place-items-center rounded-full bg-white ring-1 ring-[#e4def8] transition-transform duration-150 active:scale-[0.94]">
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={fire}
          disabled={!canFire}
          data-lab-part="tembak"
          className="rounded-[14px] bg-[#18153a] px-5 py-2.5 text-sm font-bold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
        >
          Tembak!
        </button>
      </div>
      <LabPointer />
    </div>
  );
}

function PhoneSlider({ label, value, min, max, step, unit, locked, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; locked: boolean; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#18153a]">
      <span className="flex items-center justify-between">
        <span className="flex items-center gap-1">{locked ? <Lock className="size-3 text-[#8a8a8f]" aria-hidden="true" /> : null}{label}</span>
        <span className="tabular-nums text-[#14704b]">{fmt(value, step < 1 ? 1 : 0)}{unit}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={locked} onChange={(event) => onChange(Number(event.target.value))} className="h-6 w-full accent-[#4bd29f] disabled:opacity-50" />
    </label>
  );
}

function Float({ at: point, dx = 0, dy = 0, tone, children }: { at: [number, number]; dx?: number; dy?: number; tone: "handle" | "locked" | "plain" | "ghost" | "good" | "bad" | "hint"; children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      style={{ ...pct(point), transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))` }}
      className={cn(
        "pointer-events-none absolute flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
        tone === "handle" && "bg-[#4bd29f] text-[#04352a] shadow-[0_2px_8px_rgba(75,210,159,.45)]",
        tone === "locked" && "bg-[#ece9f6] text-[#5e5e72]",
        tone === "plain" && "bg-white/90 text-[#18153a] ring-1 ring-[#e4def8]",
        tone === "ghost" && "px-0 text-[10px] font-semibold text-[#8a8a8f]",
        tone === "good" && "bg-[#14704b] text-white",
        tone === "bad" && "bg-[#b42f34] text-white",
        tone === "hint" && "parabola-breathe bg-transparent px-0 text-[11px] font-bold text-[#0f6b4a]",
      )}
    >
      {children}
    </div>
  );
}

function pathD(shot: Shot, upTo: number) {
  const f = flightOf(shot);
  const end = Math.min(upTo, f.time);
  const steps = Math.max(2, Math.round(48 * (end / f.time)));
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const p = positionAt(shot, (end * i) / steps);
    const [x, y] = flight(p.x, p.y);
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

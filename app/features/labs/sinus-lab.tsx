import { MapPin, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import "./iso/iso.css";
import { Dots, Line, Solid } from "./iso/react/draw";
import { ActionButton, ChoiceChips, Float, FeedbackPill, inPlane, labCard, MissionStrip, PhoneSlider, pagePoint, useMissions, viewPoint } from "./lab-ui";
import { AMPLITUDE, CHALLENGES, fmt, halfMarks, heightOf, isPeriodMark, matchesTarget, radianText, TARGET_WAVE, TURN, type ChallengeId, type Gear } from "./sinus/model";
import {
  BENCH_ART,
  beltFor,
  BOARD_ART,
  CRANK_ART,
  CRANK_AXES,
  crankAt,
  graphAt,
  HEIGHT,
  penAt,
  S,
  STAND_ART,
  WHEEL_ART,
  WHEEL_AXES,
  wheelAt,
  waveD,
  WIDTH,
} from "./sinus/scene";

// Lab "Mesin gelombang" (Matematika SMA). Turning the crank turns the wheel
// through a belt; the peg on the wheel rises and falls, and the pen on the graph
// board stays level with it (the dashed projection line), so the sine wave is
// drawn out of the circle as the crank turns. Numbers come from sinus/model.ts.

const SIZE: [number, number] = [WIDTH, HEIGHT];
const clampTheta = (t: number) => Math.min(TURN, Math.max(0, Math.round(t)));
const clampA = (a: number) => Math.min(AMPLITUDE.max, Math.max(AMPLITUDE.min, Math.round(a * 10) / 10));

export function SinusLab({ solved, onSolve }: { solved: string[]; onSolve: (challenge: ChallengeId) => Promise<number> }) {
  const firstOpen = CHALLENGES.findIndex((challenge) => !solved.includes(challenge.id));
  const [active, setActive] = useState(firstOpen === -1 ? 0 : firstOpen);
  const challenge = CHALLENGES[active]!;
  const [theta, setTheta] = useState(0);
  const [amplitude, setAmplitude] = useState(challenge.lock?.amplitude ?? 1);
  const [gear, setGear] = useState<Gear>(challenge.lock?.gear ?? 1);
  const [marks, setMarks] = useState<number[]>([]);
  const [touched, setTouched] = useState({ crank: false, peg: false });
  const { done, feedback, setFeedback, miss, win } = useMissions(solved, onSolve);
  const svg = useRef<SVGSVGElement>(null);
  const lastAngle = useRef<number | null>(null);

  const locked = { amplitude: challenge.lock?.amplitude !== undefined, gear: challenge.lock?.gear !== undefined };
  const y = heightOf(theta, amplitude, gear);
  const phi = gear * theta;
  const wheel = useMemo(() => wheelAt(phi, amplitude), [phi, amplitude]);
  const crank = useMemo(() => crankAt(theta), [theta]);
  const belt = useMemo(() => beltFor(gear), [gear]);
  const pen = useMemo(() => penAt(theta, y), [theta, y]);
  const wave = useMemo(() => waveD(amplitude, gear, theta), [amplitude, gear, theta]);
  const target = useMemo(() => (challenge.id === "tiru-gelombang" ? waveD(TARGET_WAVE.amplitude, TARGET_WAVE.gear, TURN, 0.2) : ""), [challenge.id]);
  const halfLine = challenge.id === "dua-sudut-setengah";

  function choose(index: number) {
    const next = CHALLENGES[index]!;
    setActive(index);
    setTheta(0);
    setAmplitude(next.lock?.amplitude ?? 1);
    setGear(next.lock?.gear ?? 1);
    setMarks([]);
    setFeedback(null);
  }

  // Mission 3 is checked when a full turn has been drawn.
  function turnTo(next: number) {
    const value = clampTheta(next);
    setTheta(value);
    setTouched((t) => ({ ...t, crank: true }));
    if (challenge.id === "tiru-gelombang" && value >= TURN - 2 && theta < TURN - 2) check(value, amplitude, gear);
  }
  function check(drawnTo: number, a: number, g: Gear) {
    if (matchesTarget(a, g, drawnTo)) {
      void win("tiru-gelombang", "Gelombangmu tepat menimpa gelombang ungu!", pagePoint(svg.current, graphAt(TURN * 0.6, 0), SIZE));
      return;
    }
    const parts: string[] = [];
    if (Math.abs(a - TARGET_WAVE.amplitude) > 0.05) parts.push(a < TARGET_WAVE.amplitude ? "puncak terlalu rendah" : "puncak terlalu tinggi");
    if (g !== TARGET_WAVE.gear) parts.push("gelombang terlalu renggang");
    miss(parts.length ? `Belum pas: ${parts.join(", ")}` : "Belum pas");
  }

  function mark() {
    const next = [...marks, theta];
    setMarks(next);
    const from = pagePoint(svg.current, graphAt(theta, y), SIZE);
    if (challenge.id === "dua-sudut-setengah") {
      const found = halfMarks(next);
      if (Math.abs(Math.sin((theta * Math.PI) / 180) - 0.5) > 0.03) {
        miss(`Pena di y = ${fmt(y)}, belum 0,50`);
        return;
      }
      if (found.length >= 2) void win("dua-sudut-setengah", `${found.map((t) => `${t}°`).join(" dan ")}: dua sudut, sin = 0,5`, from);
      else miss(`Ketemu ${theta}°. Masih ada sudut lain…`, true);
      return;
    }
    if (isPeriodMark(theta)) void win("periode-dua-kali", "Berulang di 180° = π: periodenya setengah putaran", from);
    else miss(theta < 180 ? `Di ${theta}° gelombang belum berulang` : `Di ${theta}° sudah lewat satu ulangan`);
  }

  // ---- dragging the crank (accumulates turns) and the peg (along its spoke) ----

  const dragCrank = (event: PointerEvent) => {
    if (!(event.buttons & 1)) return;
    const p = viewPoint(svg.current, event.clientX, event.clientY);
    if (!p) return;
    const [a, b] = inPlane(p, CRANK_AXES.origin, CRANK_AXES.ex, CRANK_AXES.ez);
    const angle = (Math.atan2(b, a) * 180) / Math.PI;
    if (lastAngle.current !== null) {
      let delta = angle - lastAngle.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      turnTo(theta + delta);
    }
    lastAngle.current = angle;
  };
  const dragPeg = (event: PointerEvent) => {
    if (locked.amplitude || !(event.buttons & 1)) return;
    const p = viewPoint(svg.current, event.clientX, event.clientY);
    if (!p) return;
    const [a, b] = inPlane(p, WHEEL_AXES.origin, WHEEL_AXES.ex, WHEEL_AXES.ez);
    const along = a * Math.cos((phi * Math.PI) / 180) + b * Math.sin((phi * Math.PI) / 180);
    setAmplitude(clampA(along / S));
    setTouched((t) => ({ ...t, peg: true }));
  };
  const keyCrank = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 15 : 5;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") turnTo(theta + step);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") turnTo(theta - step);
    else return;
    event.preventDefault();
  };
  const keyPeg = (event: KeyboardEvent) => {
    if (locked.amplitude) return;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") setAmplitude((a) => clampA(a + 0.1));
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") setAmplitude((a) => clampA(a - 0.1));
    else return;
    event.preventDefault();
    setTouched((t) => ({ ...t, peg: true }));
  };

  return (
    <div className={`sinus-lab ${labCard}`} data-theme="light">
      <MissionStrip missions={CHALLENGES} active={active} done={done} story={challenge.story} onChoose={choose} />

      <div className="relative">
        <svg ref={svg} className="iso-svg touch-none select-none" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Mesin gelombang. Engkol ${theta} derajat, pasak ${fmt(amplitude, 1)}, roda gigi ${gear} kali. Pena di y ${fmt(y)}.`}>
          <defs>
            <radialGradient id="sn-glow">
              <stop offset="0%" stopColor="#4bd29f" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#4bd29f" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* bench */}
          <path className="iso-halo" d={BENCH_ART.halo} />
          {BENCH_ART.feet.map((foot, i) => <Solid key={i} paths={foot} tone="lo" />)}
          <Solid paths={BENCH_ART.slab} tone="mid" />
          <Line d={BENCH_ART.groove} tone="faint" />
          <Dots points={BENCH_ART.screws} size={0.55} tone="mid" />
          <Line d={BENCH_ART.screwRings} tone="faint" />

          {/* graph board: legs, back, face, grid, axes, rail */}
          {BOARD_ART.legs.map((leg, i) => <Solid key={i} paths={leg} tone="mid" />)}
          <path className="iso-fill" d={BOARD_ART.back} />
          <Line d={BOARD_ART.back} tone="mid" />
          <path d={BOARD_ART.face} fill="#ffffff" stroke="var(--anatomy-lo)" strokeWidth={0.6} />
          <Line d={BOARD_ART.grid} tone="faint" />
          <Line d={BOARD_ART.axis} tone="mid" />
          <Dots points={BOARD_ART.corners} size={0.5} tone="lo" />
          {halfLine ? <path d={`M${graphAt(0, 0.5)[0]} ${graphAt(0, 0.5)[1]}L${graphAt(TURN, 0.5)[0]} ${graphAt(TURN, 0.5)[1]}`} stroke="#4bd29f" strokeWidth={1} strokeDasharray="3 3" /> : null}
          {target ? <path d={target} fill="none" stroke="#a594f5" strokeWidth={3} strokeLinecap="round" strokeOpacity={0.45} /> : null}
          <path d={wave} fill="none" stroke="#5e4ac4" strokeWidth={1.4} strokeLinecap="round" />
          {marks.map((t, i) => {
            const [mx, my] = graphAt(t, heightOf(t, amplitude, gear), 0.9);
            return <circle key={i} cx={mx} cy={my} r={2} fill="#e5484d" stroke="#fff" strokeWidth={0.6} />;
          })}
          {BOARD_ART.railEnds.map((end, i) => <Solid key={i} paths={end} tone="mid" />)}
          <Solid paths={BOARD_ART.rail} tone="hi" />

          {/* wheel stand, belt and pulleys behind the wheel */}
          <Solid paths={STAND_ART.foot} tone="mid" />
          <Dots points={STAND_ART.footScrews} size={0.5} tone="mid" />
          {STAND_ART.posts.map((post, i) => <Solid key={i} paths={post} tone="mid" />)}
          <Solid paths={STAND_ART.yoke} tone="mid" />
          <Line d={STAND_ART.axle} tone="hi" />
          <path className="iso-fill" d={WHEEL_ART.disc} />
          <Line d={WHEEL_ART.disc} tone="hi" />
          <Line d={WHEEL_ART.rim} tone="lo" />
          <Line d={WHEEL_ART.axes} tone="faint" dashed />
          <Line d={WHEEL_ART.ticks} tone="mid" />
          <path d={wheel.spoke} fill="#ece9f6" stroke="var(--anatomy-mid)" strokeWidth={0.6} />
          <path d={wheel.slot} fill="#d9d3ee" stroke="var(--anatomy-lo)" strokeWidth={0.5} />
          <Line d={wheel.counter} tone="mid" />
          <path d={belt.band} fill="#d9d3ee" />
          <Line d={belt.runs} tone="mid" />
          <path className="iso-fill" d={belt.pulleyWheel} />
          <Line d={belt.pulleyWheel} tone="hi" />
          <Line d={belt.teeth} tone="mid" />
          <path className="iso-fill" d={belt.pulleyCrank} />
          <Line d={belt.pulleyCrank} tone="hi" />
          <path className="iso-fill" d={WHEEL_ART.hub} />
          <Line d={WHEEL_ART.hub} tone="hi" />
          <Dots points={[WHEEL_ART.hubDot]} size={0.6} tone="hi" />

          {/* the projection: peg and pen at the same height */}
          <path d={`M${wheel.peg[0].toFixed(1)} ${wheel.peg[1].toFixed(1)}L${pen.tip[0].toFixed(1)} ${pen.tip[1].toFixed(1)}`} stroke="#4bd29f" strokeWidth={0.9} strokeDasharray="2 3" />

          {/* pen carriage on its rail */}
          <Solid paths={pen.carriage} tone="hi" />
          <path d={pen.rod} stroke="var(--anatomy-hi)" strokeWidth={0.8} />
          <circle cx={pen.tip[0]} cy={pen.tip[1]} r={1.8} fill="#5e4ac4" stroke="#fff" strokeWidth={0.6} />

          {/* the crank in front */}
          <Solid paths={CRANK_ART.post} tone="mid" />
          <path className="iso-fill" d={CRANK_ART.disc} />
          <Line d={CRANK_ART.disc} tone="hi" />
          <Line d={CRANK_ART.ring} tone="faint" />
          <path d={crank.arm} stroke="var(--anatomy-hi)" strokeWidth={1.6} strokeLinecap="round" />
          <path className="iso-fill" d={CRANK_ART.hub} />
          <Line d={CRANK_ART.hub} tone="hi" />

          {/* handles */}
          <g
            role="slider"
            tabIndex={0}
            aria-label="Engkol"
            aria-valuemin={0}
            aria-valuemax={TURN}
            aria-valuenow={theta}
            aria-valuetext={`${theta} derajat, ${radianText(theta)} radian`}
            className="parabola-handle cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => {
              (event.currentTarget as Element).setPointerCapture(event.pointerId);
              lastAngle.current = null;
              dragCrank(event);
            }}
            onPointerMove={dragCrank}
            onPointerUp={() => (lastAngle.current = null)}
            onKeyDown={keyCrank}
          >
            <circle cx={crank.handle[0]} cy={crank.handle[1]} r={10} fill="url(#sn-glow)" className={touched.crank ? "" : "parabola-breathe"} />
            <circle cx={crank.handle[0]} cy={crank.handle[1]} r={3.6} fill="#4bd29f" stroke="#0f6b4a" strokeWidth={0.9} />
            <circle cx={crank.handle[0]} cy={crank.handle[1]} r={1.1} fill="#fff" />
          </g>
          <g
            role="slider"
            tabIndex={locked.amplitude ? -1 : 0}
            aria-label="Jarak pasak (amplitudo)"
            aria-valuemin={AMPLITUDE.min}
            aria-valuemax={AMPLITUDE.max}
            aria-valuenow={amplitude}
            aria-disabled={locked.amplitude}
            className={locked.amplitude ? "" : "parabola-handle cursor-grab active:cursor-grabbing"}
            onPointerDown={(event) => {
              if (locked.amplitude) return;
              (event.currentTarget as Element).setPointerCapture(event.pointerId);
              dragPeg(event);
            }}
            onPointerMove={dragPeg}
            onKeyDown={keyPeg}
          >
            {!locked.amplitude ? <circle cx={wheel.peg[0]} cy={wheel.peg[1]} r={9} fill="url(#sn-glow)" className={touched.peg ? "" : "parabola-breathe"} /> : null}
            <circle cx={wheel.peg[0]} cy={wheel.peg[1]} r={3} fill={locked.amplitude ? "#5e4ac4" : "#4bd29f"} stroke={locked.amplitude ? "#fff" : "#0f6b4a"} strokeWidth={0.9} />
          </g>
        </svg>

        {/* floating values */}
        <Float at={crank.handle} size={SIZE} dy={-16} tone="handle">
          {theta}° · {radianText(theta)}
        </Float>
        <Float at={wheel.peg} size={SIZE} dy={-15} tone={locked.amplitude ? "locked" : "handle"}>
          A {fmt(amplitude, 1)}
        </Float>
        <Float at={pen.tip} size={SIZE} dx={30} tone="dark">
          y {fmt(y)}
        </Float>
        {BOARD_ART.labels.theta.map((label) => (
          <Float key={label.t} at={label.at} size={SIZE} tone="ghost">
            {radianText(label.t)}
          </Float>
        ))}
        {BOARD_ART.labels.y.map((label) => (
          <Float key={label.v} at={label.at} size={SIZE} tone="ghost">
            {String(label.v).replace("-", "−")}
          </Float>
        ))}
        {halfLine ? (
          <Float at={graphAt(TURN, 0.5)} size={SIZE} dx={16} tone="plain">
            0,5
          </Float>
        ) : null}
        {!touched.crank ? (
          <Float at={crank.handle} size={SIZE} dx={34} dy={4} tone="hint">
            putar
          </Float>
        ) : null}
        <span className="sr-only" aria-live="polite">{`y = ${fmt(y)}`}</span>
      </div>

      {/* phone: the same controls at full size */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#efebf9] px-3 py-2.5 sm:hidden">
        <PhoneSlider label="Engkol" value={theta} min={0} max={TURN} step={1} unit="°" locked={false} onChange={turnTo} />
        <PhoneSlider label="Pasak (A)" value={amplitude} min={AMPLITUDE.min} max={AMPLITUDE.max} step={0.1} unit="" locked={locked.amplitude} onChange={(value) => setAmplitude(clampA(value))} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#efebf9] px-3 py-2.5 sm:px-4">
        <ChoiceChips
          label="Roda gigi"
          options={[
            ["1", "Roda gigi 1×"],
            ["2", "Roda gigi 2×"],
          ]}
          value={String(gear) as "1" | "2"}
          disabled={locked.gear}
          onChange={(value) => setGear(Number(value) as Gear)}
        />
        <span className="flex-1" />
        <FeedbackPill feedback={feedback} />
        <button type="button" onClick={() => { setTheta(0); setMarks([]); setFeedback(null); }} aria-label="Ulang dari 0°" className="grid size-9 place-items-center rounded-full bg-white ring-1 ring-[#e4def8] transition-transform duration-150 active:scale-[0.94]">
          <RotateCcw className="size-4" aria-hidden="true" />
        </button>
        {challenge.marks ? (
          <ActionButton onClick={mark}>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden="true" /> Tandai
            </span>
          </ActionButton>
        ) : (
          <ActionButton onClick={() => check(theta, amplitude, gear)}>Bandingkan</ActionButton>
        )}
      </div>
    </div>
  );
}

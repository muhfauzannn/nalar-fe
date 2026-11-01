import { Check, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { cn } from "~/lib/utils";

// Lab "Bidang miring" (Fisika SMA kelas X, dinamika). A plank hinged on a base
// plate, propped by a post whose clamp sets the angle, and a 2 kg block that is
// released from the top. Every number shown comes from the same model that
// moves the block: a = g(sin θ − μk cos θ) once tan θ > μs, otherwise it stays.

const G = 9.8;
const MASS = 2;
const RAMP_METRES = 4;

export const SURFACES = {
  es: { name: "Es", static: 0.1, kinetic: 0.05, tone: "#dff3fb" },
  kayu: { name: "Kayu", static: 0.4, kinetic: 0.3, tone: "#e8d2b0" },
  karet: { name: "Karet", static: 0.8, kinetic: 0.6, tone: "#5d5a83" },
} as const;
type Surface = keyof typeof SURFACES;

export type ChallengeId = "mulai-meluncur" | "pilih-permukaan" | "percepatan-dua";

const CHALLENGES: Array<{
  id: ChallengeId;
  goal: string;
  surface?: Surface;
  angle?: number;
}> = [
  { id: "mulai-meluncur", goal: "Papan kayu: cari sudut terkecil yang membuat balok meluncur.", surface: "kayu" },
  { id: "pilih-permukaan", goal: "Sudut dikunci 30°. Pilih permukaan agar balok tetap diam.", angle: 30 },
  { id: "percepatan-dua", goal: "Papan kayu: atur sudut agar percepatan balok 2,0 m/s².", surface: "kayu" },
];

const deg = (radians: number) => (radians * 180) / Math.PI;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

export function physicsOf(angle: number, surface: Surface) {
  const theta = rad(angle);
  const { static: muS, kinetic: muK } = SURFACES[surface];
  const slides = Math.tan(theta) > muS;
  const along = MASS * G * Math.sin(theta);
  const normal = MASS * G * Math.cos(theta);
  return {
    slides,
    acceleration: slides ? G * (Math.sin(theta) - muK * Math.cos(theta)) : 0,
    along,
    normal,
    friction: slides ? muK * normal : along,
  };
}

// Has this release solved the challenge?
function solves(id: ChallengeId, angle: number, surface: Surface) {
  const p = physicsOf(angle, surface);
  if (id === "mulai-meluncur") return surface === "kayu" && p.slides && angle <= deg(Math.atan(0.4)) + 1.5;
  if (id === "pilih-permukaan") return Math.abs(angle - 30) < 0.01 && !p.slides;
  return surface === "kayu" && p.slides && Math.abs(p.acceleration - 2) <= 0.15;
}

function hintFor(id: ChallengeId, angle: number, surface: Surface) {
  const p = physicsOf(angle, surface);
  if (id === "mulai-meluncur") return p.slides ? "Meluncur, tapi masih bisa lebih landai." : "Belum meluncur: gaya gesek statis masih menahan.";
  if (id === "pilih-permukaan") return "Masih meluncur: perlu μs yang lebih besar dari tan 30°.";
  return p.slides ? (p.acceleration > 2 ? "Terlalu cepat: kurangi sudutnya." : "Terlalu lambat: tambah sudutnya.") : "Belum meluncur.";
}

// ---- drawing ---------------------------------------------------------------

type Pt = [number, number];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const path = (points: Pt[]) => `M${points.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}Z`;

const PIVOT: Pt = [150, 440];
const RAMP = 500;
const MAX_ANGLE = 55;
const PPM = RAMP / RAMP_METRES;
const DEPTH: Pt = [76, -40];
const THICK = 14;
const BLOCK = 56;
const BLOCK_H = 44;
const STOP_METRES = 0.55;

// A box drawn back to front: back face, side faces (hidden first), front face.
function Prism({ front, depth, fills }: { front: Pt[]; depth: Pt; fills: { front: string; side: string; top: string; back: string } }) {
  const back = front.map((p) => add(p, depth));
  const sides = front.map((p, index) => {
    const q = front[(index + 1) % front.length]!;
    const edge: Pt = [q[0] - p[0], q[1] - p[1]];
    // Outward normal of this edge in a clockwise-on-screen polygon.
    const outward: Pt = [edge[1], -edge[0]];
    const facing = outward[0] * depth[0] + outward[1] * depth[1];
    return { quad: [p, q, add(q, depth), add(p, depth)], facing, up: outward[1] < 0 };
  });
  sides.sort((a, b) => a.facing - b.facing);
  return (
    <g strokeLinejoin="round">
      <path d={path(back)} fill={fills.back} stroke="#18153a" strokeWidth={1.5} />
      {sides.map((side, index) => (
        <path key={index} d={path(side.quad)} fill={side.up ? fills.top : fills.side} stroke="#18153a" strokeWidth={1.5} />
      ))}
      <path d={path(front)} fill={fills.front} stroke="#18153a" strokeWidth={1.5} />
    </g>
  );
}

function Arrow({ from, to, color, label }: { from: Pt; to: Pt; color: string; label: string }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (length < 4) return null;
  const ux = dx / length;
  const uy = dy / length;
  const head: Pt[] = [to, [to[0] - ux * 12 - uy * 6, to[1] - uy * 12 + ux * 6], [to[0] - ux * 12 + uy * 6, to[1] - uy * 12 - ux * 6]];
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={to[0] - ux * 8} y2={to[1] - uy * 8} stroke={color} strokeWidth={4} strokeLinecap="round" />
      <path d={path(head)} fill={color} />
      <text x={to[0] + ux * 14} y={to[1] + uy * 14 + 5} textAnchor="middle" fontSize={18} fontWeight={700} fill={color}>
        {label}
      </text>
    </g>
  );
}

// ---- the lab ---------------------------------------------------------------

export function InclinedPlaneLab({
  solved,
  onSolve,
}: {
  solved: string[];
  onSolve: (challenge: ChallengeId) => Promise<number>;
}) {
  const firstOpen = CHALLENGES.findIndex((challenge) => !solved.includes(challenge.id));
  const [active, setActive] = useState(Math.max(0, firstOpen));
  const challenge = CHALLENGES[active]!;
  const [angle, setAngle] = useState(challenge.angle ?? 15);
  const [surface, setSurface] = useState<Surface>(challenge.surface ?? "kayu");
  // Distance of the block's centre from the hinge, along the plank, in metres.
  const [position, setPosition] = useState(RAMP_METRES - 0.35);
  const [phase, setPhase] = useState<"ready" | "moving" | "done">("ready");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string; points?: number } | null>(null);
  const [done, setDone] = useState<string[]>(solved);
  const svg = useRef<SVGSVGElement>(null);
  const frame = useRef(0);

  const locked = phase !== "ready";
  const theta = rad(angle);
  const u: Pt = [Math.cos(theta), -Math.sin(theta)];
  const n: Pt = [-Math.sin(theta), -Math.cos(theta)];
  const top = add(PIVOT, mul(u, RAMP));
  const p = useMemo(() => physicsOf(angle, surface), [angle, surface]);

  const pick = (index: number) => {
    const next = CHALLENGES[index]!;
    cancelAnimationFrame(frame.current);
    setActive(index);
    setAngle(next.angle ?? 15);
    setSurface(next.surface ?? "kayu");
    setPosition(RAMP_METRES - 0.35);
    setPhase("ready");
    setFeedback(null);
  };

  const reset = () => {
    cancelAnimationFrame(frame.current);
    setPosition(RAMP_METRES - 0.35);
    setPhase("ready");
    setFeedback(null);
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const finish = async () => {
    setPhase("done");
    const ok = solves(challenge.id, angle, surface);
    if (!ok) {
      setFeedback({ ok: false, text: hintFor(challenge.id, angle, surface) });
      return;
    }
    setFeedback({ ok: true, text: "Tepat!" });
    if (!done.includes(challenge.id)) {
      setDone((list) => [...list, challenge.id]);
      try {
        const points = await onSolve(challenge.id);
        setFeedback({ ok: true, text: "Tepat!", points });
      } catch {
        setFeedback({ ok: true, text: "Tepat! Poinnya belum tersimpan, coba lagi nanti." });
      }
    }
  };

  const release = () => {
    if (phase !== "ready") return;
    setFeedback(null);
    if (!p.slides) {
      // Static friction holds: nothing moves, the result is immediate.
      void finish();
      return;
    }
    setPhase("moving");
    const start = performance.now();
    const from = RAMP_METRES - 0.35;
    // The block stops against the bumper near the hinge.
    const end = STOP_METRES + BLOCK / 2 / PPM;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = (now: number) => {
      const t = (now - start) / 1000;
      const next = reduce ? end : Math.max(end, from - 0.5 * p.acceleration * t * t);
      setPosition(next);
      if (next > end) frame.current = requestAnimationFrame(step);
      else void finish();
    };
    frame.current = requestAnimationFrame(step);
  };

  // Dragging the clamp up the post tilts the plank about its hinge.
  const dragAngle = (event: PointerEvent<SVGGElement>) => {
    if (locked || challenge.angle !== undefined || !svg.current) return;
    const matrix = svg.current.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const next = deg(Math.atan2(PIVOT[1] - point.y, point.x - PIVOT[0]));
    setAngle(Math.round(Math.min(MAX_ANGLE, Math.max(5, next)) * 2) / 2);
  };
  const keyAngle = (event: KeyboardEvent<SVGGElement>) => {
    if (locked || challenge.angle !== undefined) return;
    const delta = { ArrowUp: 0.5, ArrowRight: 0.5, ArrowDown: -0.5, ArrowLeft: -0.5 }[event.key];
    if (!delta) return;
    event.preventDefault();
    setAngle((value) => Math.min(MAX_ANGLE, Math.max(5, value + delta)));
  };

  // Geometry of the scene for this angle.
  const surfaceFront: Pt[] = [PIVOT, top, add(top, mul(n, -THICK)), add(PIVOT, mul(n, -THICK))];
  const postS = RAMP * 0.6;
  const postTop = add(add(PIVOT, mul(u, postS)), add(mul(n, -THICK), mul(DEPTH, 0.5)));
  const postBottom: Pt = [postTop[0], PIVOT[1] + DEPTH[1] * 0.5];
  const along = position * PPM;
  const blockBase = add(add(PIVOT, mul(u, along)), mul(DEPTH, 0.22));
  const blockFront: Pt[] = [
    add(blockBase, mul(u, -BLOCK / 2)),
    add(add(blockBase, mul(u, -BLOCK / 2)), mul(n, BLOCK_H)),
    add(add(blockBase, mul(u, BLOCK / 2)), mul(n, BLOCK_H)),
    add(blockBase, mul(u, BLOCK / 2)),
  ];
  const centre = add(add(blockBase, mul(n, BLOCK_H / 2)), mul(DEPTH, 0.28));
  const scale = 4;
  const surfaceTone = SURFACES[surface].tone;

  return (
    <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#ece7fb] text-[#18153a] [color-scheme:light]">
      <svg
        ref={svg}
        viewBox="40 0 880 550"
        className="block aspect-[880/550] w-full touch-none select-none"
        role="img"
        aria-label={`Bidang miring ${angle.toFixed(1)} derajat, permukaan ${SURFACES[surface].name}`}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#d3c5f8" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="40" width="880" height="550" fill="url(#grid)" opacity={0.6} />

        {/* Base plate on four feet, with a metre ruler and screws. */}
        <Prism
          front={[[90, 462], [800, 462], [800, 490], [90, 490]]}
          depth={DEPTH}
          fills={{ front: "#25225f", side: "#25225f", top: "#a99be8", back: "#18153a" }}
        />
        {[110, 780].map((x) => (
          <rect key={x} x={x - 12} y={490} width={24} height={14} rx={4} fill="#18153a" />
        ))}
        {[[112, 470], [778, 470], [112 + DEPTH[0], 470 + DEPTH[1] - 8], [778 + DEPTH[0], 470 + DEPTH[1] - 8]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y! - 4} r={3.5} fill="#ece7fb" stroke="#18153a" strokeWidth={1} />
        ))}

        {/* Protractor at the hinge. */}
        <path
          d={`M${PIVOT[0] + 110} ${PIVOT[1]} A110 110 0 0 0 ${PIVOT[0] + 110 * Math.cos(theta)} ${PIVOT[1] - 110 * Math.sin(theta)}`}
          fill="none"
          stroke="#4bd29f"
          strokeWidth={5}
        />
        {Array.from({ length: 13 }, (_, index) => {
          const a = rad(index * 5);
          return (
            <line
              key={index}
              x1={PIVOT[0] + 128 * Math.cos(a)}
              y1={PIVOT[1] - 128 * Math.sin(a)}
              x2={PIVOT[0] + (index % 2 ? 136 : 142) * Math.cos(a)}
              y2={PIVOT[1] - (index % 2 ? 136 : 142) * Math.sin(a)}
              stroke="#5d5a83"
              strokeWidth={index % 2 ? 1.5 : 2.5}
            />
          );
        })}
        <text x={PIVOT[0] + 120} y={PIVOT[1] - 10} fontSize={20} fontWeight={700} fill="#18153a">
          θ
        </text>

        {/* Post with its clamp: the clamp is the angle handle. */}
        <rect x={postTop[0] - 7} y={postTop[1]} width={14} height={Math.max(0, postBottom[1] - postTop[1])} rx={5} fill="#5d5a83" stroke="#18153a" strokeWidth={1.5} />

        {/* The plank, with its working surface. */}
        <Prism
          front={surfaceFront}
          depth={DEPTH}
          fills={{ front: "#18153a", side: "#25225f", top: surfaceTone, back: "#18153a" }}
        />
        {Array.from({ length: RAMP_METRES * 2 + 1 }, (_, index) => {
          const at = add(PIVOT, mul(u, (index * PPM) / 2));
          const inner = add(at, mul(n, -(index % 2 ? 6 : 10)));
          return <line key={index} x1={at[0]} y1={at[1]} x2={inner[0]} y2={inner[1]} stroke="#ece7fb" strokeWidth={2} />;
        })}
        <circle cx={PIVOT[0] + DEPTH[0] * 0.5} cy={PIVOT[1] + DEPTH[1] * 0.5 - 4} r={9} fill="#a99be8" stroke="#18153a" strokeWidth={2} />

        {/* Bumper that stops the block before the hinge. */}
        <Prism
          front={[
            add(PIVOT, mul(u, (STOP_METRES - 0.12) * PPM)),
            add(add(PIVOT, mul(u, (STOP_METRES - 0.12) * PPM)), mul(n, 20)),
            add(add(PIVOT, mul(u, STOP_METRES * PPM)), mul(n, 20)),
            add(PIVOT, mul(u, STOP_METRES * PPM)),
          ]}
          depth={DEPTH}
          fills={{ front: "#25225f", side: "#18153a", top: "#5d5a83", back: "#18153a" }}
        />

        {/* The 2 kg block. */}
        <Prism
          front={blockFront}
          depth={mul(DEPTH, 0.56)}
          fills={{ front: "#4bd29f", side: "#2fa87c", top: "#a6e9cf", back: "#2fa87c" }}
        />
        <text
          x={(blockFront[0]![0] + blockFront[2]![0]) / 2}
          y={(blockFront[0]![1] + blockFront[2]![1]) / 2 + 6}
          textAnchor="middle"
          fontSize={16}
          fontWeight={700}
          fill="#04352a"
          transform={`rotate(${-angle} ${(blockFront[0]![0] + blockFront[2]![0]) / 2} ${(blockFront[0]![1] + blockFront[2]![1]) / 2})`}
        >
          2 kg
        </text>

        {/* Forces on the block, to scale. */}
        <Arrow from={centre} to={add(centre, [0, MASS * G * scale])} color="#18153a" label="W" />
        <Arrow from={centre} to={add(centre, mul(n, p.normal * scale))} color="#5d5a83" label="N" />
        <Arrow from={centre} to={add(centre, mul(u, p.friction * scale))} color="#c98a12" label="f" />

        {/* Clamp handle, drawn last so it is always reachable. */}
        <g
          role="slider"
          tabIndex={challenge.angle === undefined && !locked ? 0 : -1}
          aria-label="Sudut bidang miring"
          aria-valuemin={5}
          aria-valuemax={MAX_ANGLE}
          aria-valuenow={angle}
          aria-valuetext={`${angle.toFixed(1)} derajat`}
          aria-disabled={challenge.angle !== undefined || locked}
          className={cn(
            "outline-none",
            challenge.angle === undefined && !locked ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed",
          )}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragAngle(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) dragAngle(event);
          }}
          onKeyDown={keyAngle}
        >
          <circle cx={postTop[0]} cy={postTop[1]} r={34} fill="transparent" />
          <circle cx={postTop[0]} cy={postTop[1]} r={18} fill={challenge.angle === undefined ? "#f5b83d" : "#a99be8"} stroke="#18153a" strokeWidth={2.5} />
          {Array.from({ length: 8 }, (_, index) => {
            const a = (index * Math.PI) / 4;
            return (
              <line
                key={index}
                x1={postTop[0] + 10 * Math.cos(a)}
                y1={postTop[1] + 10 * Math.sin(a)}
                x2={postTop[0] + 16 * Math.cos(a)}
                y2={postTop[1] + 16 * Math.sin(a)}
                stroke="#18153a"
                strokeWidth={2}
              />
            );
          })}
          <circle cx={postTop[0]} cy={postTop[1]} r={4} fill="#18153a" />
        </g>
      </svg>

      {/* Challenge strip. */}
      <div className="absolute left-3 right-3 top-3 flex flex-wrap items-start gap-2 sm:left-4 sm:right-auto sm:max-w-[30rem]">
        <ol className="flex gap-1.5" aria-label="Tantangan">
          {CHALLENGES.map((item, index) => {
            const isDone = done.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => pick(index)}
                  aria-pressed={index === active}
                  aria-label={`Tantangan ${index + 1}${isDone ? ", selesai" : ""}`}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 font-heading text-sm font-bold transition-transform duration-150 active:scale-95",
                    index === active ? "border-[#18153a] bg-[#18153a] text-white" : "border-white bg-white/90",
                    isDone && index !== active && "border-[#4bd29f] bg-[#dff7ee] text-[#0f6e56]",
                  )}
                >
                  {isDone ? <Check className="size-4" strokeWidth={3} /> : index + 1}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="min-w-0 flex-1 rounded-2xl bg-white/92 px-3 py-2 text-sm font-medium shadow-sm">{challenge.goal}</p>
      </div>

      {/* Surface choice, floating on the bench. */}
      <div className="absolute bottom-3 left-3 flex gap-1.5 rounded-2xl bg-white/92 p-1.5 shadow-sm sm:bottom-4 sm:left-4" role="radiogroup" aria-label="Permukaan papan">
        {(Object.keys(SURFACES) as Surface[]).map((key) => {
          const fixed = challenge.surface !== undefined;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={surface === key}
              disabled={locked || (fixed && key !== challenge.surface)}
              onClick={() => setSurface(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 disabled:opacity-35 sm:text-sm",
                surface === key ? "bg-[#18153a] text-white" : "hover:bg-[#ece7fb]",
              )}
            >
              <span className="size-3 rounded-full ring-1 ring-black/20" style={{ background: SURFACES[key].tone }} />
              {SURFACES[key].name}
              <span className="font-normal opacity-70 max-sm:hidden">μs {SURFACES[key].static}</span>
            </button>
          );
        })}
      </div>

      {/* Release or reset, and the readout. */}
      <div className="absolute bottom-3 right-3 flex items-end gap-2 sm:bottom-4 sm:right-4">
        <div className="rounded-2xl bg-white/92 px-3 py-2 text-right text-xs tabular-nums shadow-sm sm:text-sm">
          <p>
            θ <strong>{angle.toFixed(1)}°</strong> · a = <strong>{p.acceleration.toFixed(2)}</strong> m/s²
          </p>
          <p className="text-[#5d5a83]">W∥ {p.along.toFixed(1)} N · f {p.friction.toFixed(1)} N</p>
        </div>
        {phase === "ready" ? (
          <button
            type="button"
            onClick={release}
            className="min-h-12 rounded-2xl bg-[#4bd29f] px-5 font-bold text-[#04352a] shadow-sm transition-transform duration-150 active:scale-[0.97]"
          >
            Lepas balok
          </button>
        ) : (
          <button
            type="button"
            onClick={reset}
            disabled={phase === "moving"}
            className="flex min-h-12 items-center gap-2 rounded-2xl bg-[#18153a] px-4 font-bold text-white shadow-sm transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Ulangi
          </button>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          className={cn(
            "absolute left-1/2 top-[38%] flex -translate-x-1/2 animate-in items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-md duration-200 fade-in-0 zoom-in-95",
            feedback.ok ? "bg-[#18153a] text-white" : "bg-white text-[#18153a]",
          )}
        >
          {feedback.ok && <Check className="size-4 text-[#4bd29f]" strokeWidth={3} aria-hidden="true" />}
          {feedback.text}
          {feedback.points ? <span className="rounded-full bg-[#4bd29f] px-2 py-0.5 text-xs text-[#04352a]">+{feedback.points}</span> : null}
        </div>
      )}
    </div>
  );
}

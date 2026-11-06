import { Droplet } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import "./iso/iso.css";
import { Dots, Line, Solid } from "./iso/react/draw";
import { ActionButton, ChoiceChips, Float, FeedbackPill, labCard, MissionStrip, PhoneSlider, pagePoint, useLabState, useMissions, viewPoint } from "./lab-ui";
import { LabPointer } from "./lab-pointer";
import { LabStoryPanel, useLabStory } from "./lab-story";
import { BURST, CELLS, CHALLENGES, fmt, flowOf, judge, SALT, stateOf, volumeOf, type ChallengeId, type Guess, type State } from "./osmosis/model";
import { STORY } from "./osmosis/story";
import { bloodOutline, CONE, HEIGHT, ONION, ONION_CELLS, PIPETTE_ART, RING_AXIS, ringAt, roundRect, saltAtZ, scatter, SCOPE_ART, VIEW, WIDTH } from "./osmosis/scene";

// Lab "Mikroskop osmosis" (Biologi SMA). Set the salt on the dropper's scale
// ring, drop it on the slide, and watch the cell through the eyepiece: blue
// arrows are water crossing the membrane, yellow dots are salt outside. The
// cell's volume follows osmosis/model.ts and eases there like a real cell.

const SIZE: [number, number] = [WIDTH, HEIGHT];
const IONS = scatter(240, 7);
const ARROWS = 12;
const snapSalt = (value: number) => Math.min(SALT.max, Math.max(SALT.min, Math.round(value / SALT.step) * SALT.step));
const MISSION_IDS = CHALLENGES.map((item) => item.id);
const pct = (salt: number) => `${fmt(salt, 2)} %`;

const STATE_TEXT: Record<State, string> = {
  pecah: "pecah (hemolisis)",
  menggembung: "menggembung",
  normal: "utuh",
  mengkerut: "mengkerut (krenasi)",
  turgid: "turgid",
  plasmolisis: "plasmolisis",
};

export function OsmosisLab({ solved, onSolve, onState, story: told }: { solved: string[]; onSolve: (challenge: ChallengeId) => Promise<number>; onState?: (summary: string) => void; story?: boolean }) {
  const firstOpen = CHALLENGES.findIndex((challenge) => !solved.includes(challenge.id));
  const [active, setActive] = useState(firstOpen === -1 ? 0 : firstOpen);
  const challenge = CHALLENGES[active]!;
  const cell = challenge.cell;
  const [salt, setSalt] = useState(challenge.start);
  // what is on the slide now (the cell starts in an isotonic drop), and the cell's volume
  const [applied, setApplied] = useState(CELLS[cell].iso);
  const [volume, setVolume] = useState(1);
  const [burst, setBurst] = useState(false);
  const [phase, setPhase] = useState(0);
  const [dropT, setDropT] = useState<number | null>(null);
  const [guess, setGuess] = useState<Guess | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const { done, feedback, setFeedback, miss, win } = useMissions(solved, onSolve);
  const svg = useRef<SVGSVGElement>(null);
  const live = useRef({ volume, target: 1, burst, cell });
  const story = useLabStory(STORY, { on: told, ids: MISSION_IDS, done, goTo: reset });
  const locked = challenge.lock !== undefined && !story.touring;

  const target = Math.min(volumeOf(cell, applied), BURST + 0.2);
  live.current.target = target;
  live.current.cell = cell;
  const state: State = burst ? "pecah" : stateOf(cell, volume);
  const flow = flowOf(cell, applied);
  const ring = useMemo(() => ringAt(salt), [salt]);
  useLabState(onState, [
    story.summary,
    `Misi ${active + 1} dari ${CHALLENGES.length} (${challenge.id}): ${challenge.story}`,
    `Sel ${cell === "darah" ? "darah merah" : "bawang merah"}; cincin pipet di ${salt === 0 ? "air suling" : pct(salt)}; larutan di kaca ${applied === 0 ? "air suling" : pct(applied)}`,
    `Di lensa: sel ${STATE_TEXT[state]}, volume ${burst ? "—" : `${Math.round(Math.min(volume, BURST) * 100)} %`}${busy ? " (sedang menyesuaikan)" : ""}`,
    challenge.predict && `Tebakan siswa: ${guess ?? "belum menebak"}`,
    feedback && `Umpan balik lab: ${feedback.text}`,
    `Sudah selesai: ${done.length ? done.join(", ") : "belum ada"}`,
  ]);

  // the cell eases toward its volume; the water arrows keep moving while it does (and both ways at balance)
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = performance.now();
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => (visible = !!entry?.isIntersecting));
    if (svg.current) observer.observe(svg.current);
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const l = live.current;
      if (visible && !l.burst) {
        const next = reduce ? l.target : l.volume + (l.target - l.volume) * (1 - Math.exp(-dt / 0.55));
        if (Math.abs(next - l.volume) > 1e-4) {
          l.volume = next;
          setVolume(next);
          if (l.cell === "darah" && next >= BURST) {
            l.burst = true;
            setBurst(true);
          }
        }
        if (!reduce) setPhase((p) => (p + dt * 0.9) % 1);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  function reset(index: number) {
    const next = CHALLENGES[index]!;
    const iso = CELLS[next.cell].iso;
    setActive(index);
    setSalt(next.start);
    setApplied(iso);
    setVolume(1);
    setBurst(false);
    live.current = { volume: 1, target: 1, burst: false, cell: next.cell };
    setGuess(null);
    setFeedback(null);
  }

  const changeSalt = (value: number) => {
    if (locked) return;
    setSalt(snapSalt(value));
    setTouched(true);
    setFeedback(null);
  };

  /** Drop the dropper's solution on the slide, let the cell settle, then judge. */
  function drop() {
    if (busy) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setBusy(true);
    setFeedback(null);
    // a fresh drop on a fresh cell
    setBurst(false);
    setVolume(1);
    setApplied(CELLS[cell].iso);
    live.current = { volume: 1, target: 1, burst: false, cell };
    const start = performance.now();
    const fall = (now: number) => {
      const t = Math.min(1, (now - start) / 380);
      setDropT(t);
      if (t < 1) requestAnimationFrame(fall);
      else {
        setDropT(null);
        setApplied(salt);
        window.setTimeout(() => {
          setBusy(false);
          const verdict = judge(challenge.id, salt, guess);
          const from = pagePoint(svg.current, [VIEW.cx, VIEW.cy], SIZE);
          if (verdict.ok) void win(challenge.id, verdict.text, from);
          else miss(verdict.text);
        }, 1900);
      }
    };
    if (reduce) {
      setApplied(salt);
      setBusy(false);
      const verdict = judge(challenge.id, salt, guess);
      if (verdict.ok) void win(challenge.id, verdict.text, pagePoint(svg.current, [VIEW.cx, VIEW.cy], SIZE));
      else miss(verdict.text);
      return;
    }
    requestAnimationFrame(fall);
  }

  // ---- dragging the ring along the dropper ----

  const dragRing = (event: PointerEvent) => {
    if (locked || !(event.buttons & 1)) return;
    const p = viewPoint(svg.current, event.clientX, event.clientY);
    if (!p) return;
    const { origin, ez } = RING_AXIS;
    const z = ((p[0] - origin[0]) * ez[0] + (p[1] - origin[1]) * ez[1]) / (ez[0] * ez[0] + ez[1] * ez[1]);
    changeSalt(saltAtZ(z));
  };
  const keyRing = (event: KeyboardEvent) => {
    if (locked) return;
    const step = event.shiftKey ? 0.25 : SALT.step;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") changeSalt(salt + step);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") changeSalt(salt - step);
    else return;
    event.preventDefault();
  };

  // ---- the field: salt outside, the cell, water arrows across its membrane ----

  const ions = IONS.slice(0, Math.round((applied / SALT.max) * IONS.length));
  const tint = Math.min(1, applied / SALT.max);
  const v = Math.min(volume, BURST);
  const bloodR = 46 * v ** 0.35;
  const bumps = cell === "darah" ? Math.max(0, Math.min(0.14, (0.97 - v) * 0.9)) : 0;
  const pale = Math.max(0, Math.min(1, (1.25 - v) / 0.35)) * 0.75;
  const shrink = Math.min(1, volume);
  const proto = { w: (ONION.w - ONION.wall - 6) * shrink ** 0.8, h: (ONION.h - ONION.wall - 6) * shrink ** 0.45, r: 6 + (1 - shrink) * 70 };
  const flux = target - volume;
  const balanced = flow === 0 || Math.abs(flux) < 0.01;
  const arrowAlpha = burst ? 0 : balanced ? 0.45 : Math.min(1, 0.35 + Math.abs(flux) * 3);
  const arrows = Array.from({ length: ARROWS }, (_, i) => {
    const a = (i / ARROWS) * Math.PI * 2 + 0.2;
    // at balance, every other arrow points the other way
    const inward = balanced ? i % 2 === 0 : flux > 0;
    const t = (phase + i * 0.37) % 1;
    const rimX = cell === "darah" ? bloodR : proto.w / 2;
    const rimY = cell === "darah" ? bloodR * 0.92 : proto.h / 2;
    const off = (inward ? 1 - t : t) * 28 - 14;
    const x = VIEW.cx + Math.cos(a) * (rimX + off * Math.abs(Math.cos(a)) + (cell === "darah" ? 0 : 0));
    const y = VIEW.cy + Math.sin(a) * (rimY + off * Math.abs(Math.sin(a)));
    const angle = (Math.atan2(Math.sin(a), Math.cos(a)) * 180) / Math.PI + (inward ? 180 : 0);
    const fade = Math.sin(t * Math.PI);
    return { x, y, angle, opacity: arrowAlpha * fade };
  });

  const canDrop = (!challenge.predict || guess !== null) && !busy && !story.reading;
  const stateTone = state === "pecah" || state === "plasmolisis" || state === "mengkerut" ? "bad" : state === "menggembung" ? "plain" : "good";

  return (
    <div className={`osmosis-lab ${labCard}`} data-theme="light">
      <MissionStrip missions={CHALLENGES} active={active} done={done} story={story.strip ?? challenge.story} onChoose={(index) => (story.leave(), reset(index))} onReplay={story.replay} />

      <div className="relative">
        <svg ref={svg} className="iso-svg touch-none select-none" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Mikroskop. Sel ${cell === "darah" ? "darah merah" : "bawang merah"} dalam larutan garam ${pct(applied)}: ${STATE_TEXT[state]}, volume ${Math.round(Math.min(volume, BURST) * 100)} persen.`}>
          <defs>
            <radialGradient id="os-glow">
              <stop offset="0%" stopColor="#4bd29f" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#4bd29f" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="os-rbc">
              <stop offset="0%" stopColor="#f6a3a6" />
              <stop offset="55%" stopColor="#e2545a" />
              <stop offset="100%" stopColor="#c23b42" />
            </radialGradient>
            <radialGradient id="os-cloud">
              <stop offset="0%" stopColor="#e2545a" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#e2545a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="os-beam" cx="0" cy="0.5" r="1">
              <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0.08" />
            </radialGradient>
            <clipPath id="os-field">
              <circle cx={VIEW.cx} cy={VIEW.cy} r={VIEW.r} />
            </clipPath>
          </defs>

          {/* the light from the eyepiece out to the field */}
          <path d={`M${CONE.from[0]} ${CONE.from[1]}L${CONE.top[0]} ${CONE.top[1]}L${CONE.bottom[0]} ${CONE.bottom[1]}Z`} fill="#fff4cf" fillOpacity={0.5} />
          <path d={`M${CONE.from[0]} ${CONE.from[1]}L${CONE.top[0]} ${CONE.top[1]}M${CONE.from[0]} ${CONE.from[1]}L${CONE.bottom[0]} ${CONE.bottom[1]}`} stroke="#e8d79a" strokeWidth={0.6} strokeDasharray="2 3" />

          {/* the microscope */}
          <path className="iso-halo" d={SCOPE_ART.halo} />
          {SCOPE_ART.feet.map((foot, i) => <Solid key={i} paths={foot} tone="lo" />)}
          <Solid paths={SCOPE_ART.base} tone="mid" />
          <Line d={SCOPE_ART.groove} tone="faint" />
          <Solid paths={SCOPE_ART.plate} tone="mid" />
          <Line d={SCOPE_ART.plateRules} tone="faint" />
          <Solid paths={SCOPE_ART.lamp} tone="mid" />
          <path d={SCOPE_ART.lampGlass} fill="#ffe9a8" stroke="var(--anatomy-mid)" strokeWidth={0.4} />
          <Solid paths={SCOPE_ART.pillar} tone="mid" />
          <Line d={SCOPE_ART.pillarSeam} tone="faint" />
          <path className="iso-fill" d={SCOPE_ART.knobs[0]} />
          <Line d={SCOPE_ART.knobs[0]!} tone="mid" />
          <Line d={SCOPE_ART.knobEdge} tone="mid" />
          <path className="iso-fill" d={SCOPE_ART.knobs[1]} />
          <Line d={SCOPE_ART.knobs[1]!} tone="hi" />
          <Line d={SCOPE_ART.knobs[2]!} tone="faint" />
          <Solid paths={SCOPE_ART.stage} tone="hi" />
          <path d={SCOPE_ART.stageHole} fill="#ffe9a8" stroke="var(--anatomy-lo)" strokeWidth={0.4} />
          <Solid paths={SCOPE_ART.slide} tone="hi" crease="none" />
          <path d={SCOPE_ART.drop} fill={applied > 0 ? "#fbe7b0" : "#d8ecf8"} fillOpacity={0.9} stroke="#9cc9e4" strokeWidth={0.5} />
          {SCOPE_ART.clips.map((clip, i) => <Solid key={i} paths={clip} tone="mid" />)}
          <Dots points={SCOPE_ART.clipScrews} size={0.5} tone="mid" />
          {SCOPE_ART.objectiveSide.map((o, i) => <Solid key={i} paths={o} tone="lo" />)}
          <Solid paths={SCOPE_ART.objective} tone="hi" />
          <Line d={SCOPE_ART.objectiveBand} tone="red" />
          <Solid paths={SCOPE_ART.nose} tone="mid" />
          <Solid paths={SCOPE_ART.arm} tone="mid" />
          <Solid paths={SCOPE_ART.body} tone="hi" />
          <Line d={SCOPE_ART.bodyBand} tone="faint" />
          <Solid paths={SCOPE_ART.eyepiece} tone="mid" />

          {/* the dropper over the slide, with the falling drop */}
          <path d={PIPETTE_ART.tip} fill="#eef5fb" stroke="var(--anatomy-mid)" strokeWidth={0.5} />
          <Solid paths={PIPETTE_ART.body} tone="hi" />
          <Line d={PIPETTE_ART.ticks} tone="mid" />
          <Solid paths={PIPETTE_ART.collar} tone="mid" />
          <path className="iso-fill" d={PIPETTE_ART.bulb.fill} />
          <Solid paths={PIPETTE_ART.bulb} tone="lo" />
          <Solid paths={PIPETTE_ART.bulbTop} tone="lo" />
          {dropT !== null ? <circle cx={PIPETTE_ART.dropAt(dropT)[0]} cy={PIPETTE_ART.dropAt(dropT)[1]} r={1.6} fill={salt > 0 ? "#f5c84b" : "#9cc9e4"} /> : null}

          {/* the field of view */}
          <circle cx={VIEW.cx} cy={VIEW.cy} r={VIEW.r + 9} fill="#2b2740" data-lab-part="lensa" />
          <g clipPath="url(#os-field)">
            <rect x={VIEW.cx - VIEW.r} y={VIEW.cy - VIEW.r} width={VIEW.r * 2} height={VIEW.r * 2} fill={`rgb(${252 - tint * 4}, ${251 - tint * 12}, ${246 - tint * 60})`} />
            {ions.map(([x, y], i) => (
              <circle key={i} cx={VIEW.cx + x * VIEW.r} cy={VIEW.cy + y * VIEW.r} r={1.7} fill="#f0b429" fillOpacity={0.85} />
            ))}

            {cell === "darah" ? (
              burst ? (
                <g>
                  <circle cx={VIEW.cx} cy={VIEW.cy} r={bloodR * 1.9} fill="url(#os-cloud)" />
                  <path d={bloodOutline(bloodR, 0)} fill="none" stroke="#e7a3a6" strokeWidth={1.4} strokeDasharray="14 6 22 9" />
                  {scatter(10, 3).map(([x, y], i) => (
                    <circle key={i} cx={VIEW.cx + x * bloodR * 1.5} cy={VIEW.cy + y * bloodR * 1.5} r={2.2} fill="#d9585e" fillOpacity={0.5} />
                  ))}
                </g>
              ) : (
                <g>
                  <path d={bloodOutline(bloodR, bumps)} fill="url(#os-rbc)" stroke="#a8323a" strokeWidth={1} />
                  <ellipse cx={VIEW.cx} cy={VIEW.cy} rx={bloodR * 0.42} ry={bloodR * 0.38} fill="#f8c2c4" opacity={pale} />
                </g>
              )
            ) : (
              ONION_CELLS.map(([cx, cy], i) => (
                <g key={i}>
                  <path d={roundRect(cx, cy, proto.w, proto.h, proto.r)} fill="#f4eedf" stroke="#8b7a4a" strokeWidth={0.8} />
                  <path d={roundRect(cx, cy, Math.max(4, proto.w - 14), Math.max(4, proto.h - 14), Math.max(2, proto.r - 4))} fill="#8e3fa8" fillOpacity={Math.min(0.9, 0.38 + (1 - shrink) * 1.6)} />
                  <circle cx={cx - proto.w / 2 + 10} cy={cy + 2} r={4.5} fill="#cbbf9d" stroke="#8b7a4a" strokeWidth={0.5} />
                  <path d={roundRect(cx, cy, ONION.w - ONION.wall, ONION.h - ONION.wall, 4)} fill="none" stroke="#b49a58" strokeWidth={ONION.wall} />
                </g>
              ))
            )}

            {/* water crossing the membrane */}
            {arrows.map((arrow, i) => (
              <g key={i} transform={`translate(${arrow.x.toFixed(1)} ${arrow.y.toFixed(1)}) rotate(${arrow.angle.toFixed(0)})`} opacity={arrow.opacity.toFixed(2)}>
                <path d="M-5 0H4M1 -3L4 0L1 3" fill="none" stroke="#2f7fe0" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
          </g>
          <circle cx={VIEW.cx} cy={VIEW.cy} r={VIEW.r} fill="none" stroke="#5d5875" strokeWidth={1.5} />
          <circle cx={VIEW.cx} cy={VIEW.cy} r={VIEW.r + 9} fill="none" stroke="#18153a" strokeWidth={0.8} />
          {Array.from({ length: 48 }, (_, i) => {
            const a = (i / 48) * Math.PI * 2;
            return <path key={i} d={`M${VIEW.cx + Math.cos(a) * (VIEW.r + 4)} ${VIEW.cy + Math.sin(a) * (VIEW.r + 4)}L${VIEW.cx + Math.cos(a) * (VIEW.r + 8)} ${VIEW.cy + Math.sin(a) * (VIEW.r + 8)}`} stroke="#5d5875" strokeWidth={0.8} />;
          })}

          {/* the scale ring on the dropper: the handle */}
          <g
            role="slider"
            tabIndex={locked ? -1 : 0}
            aria-label="Kadar garam di pipet"
            data-lab-part="pipet"
            aria-valuemin={SALT.min}
            aria-valuemax={SALT.max}
            aria-valuenow={salt}
            aria-valuetext={pct(salt)}
            aria-disabled={locked}
            className={locked ? "" : "parabola-handle cursor-grab active:cursor-grabbing"}
            onPointerDown={(event) => {
              if (locked) return;
              (event.currentTarget as Element).setPointerCapture(event.pointerId);
              dragRing(event);
            }}
            onPointerMove={dragRing}
            onKeyDown={keyRing}
          >
            {!locked ? <circle cx={ring.grip[0]} cy={ring.grip[1]} r={13} fill="url(#os-glow)" className={touched ? "" : "parabola-breathe"} /> : null}
            <path d={ring.band.fill} fill={locked ? "#ece9f6" : "#4bd29f"} />
            <path d={ring.band.outline} fill="none" stroke={locked ? "var(--anatomy-mid)" : "#0f6b4a"} strokeWidth={0.7} />
          </g>
        </svg>

        {/* floating values */}
        <Float at={ring.grip} size={SIZE} dx={44} tone={locked ? "locked" : "handle"}>
          {salt === 0 ? "air suling" : pct(salt)}
        </Float>
        {!touched && !locked ? (
          <Float at={ring.grip} size={SIZE} dx={36} dy={18} tone="hint">
            geser
          </Float>
        ) : null}
        {PIPETTE_ART.labels.map((label) => (
          <Float key={label.salt} at={label.at} size={SIZE} dx={16} tone="ghost">
            {label.salt}
          </Float>
        ))}
        <Float at={[VIEW.cx, VIEW.cy - VIEW.r + 22]} size={SIZE} tone={stateTone}>
          {STATE_TEXT[state]}
        </Float>
        <Float at={[VIEW.cx, VIEW.cy + VIEW.r - 22]} size={SIZE} tone="dark">
          volume {burst ? "—" : `${Math.round(Math.min(volume, BURST) * 100)} %`}
        </Float>
        <Float at={[VIEW.cx + VIEW.r * 0.74, VIEW.cy + VIEW.r * 0.74]} size={SIZE} tone="ghost">
          400×
        </Float>
        <div className="pointer-events-none absolute bottom-2 left-2 hidden items-center gap-2 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold text-[#18153a] ring-1 ring-[#e9e4f8] sm:flex" aria-hidden="true">
          <span className="flex items-center gap-1">
            <svg viewBox="-6 -4 12 8" className="h-2 w-3">
              <path d="M-5 0H4M1 -3L4 0L1 3" fill="none" stroke="#2f7fe0" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            air
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#f0b429]" />
            garam
          </span>
          <span className="text-[#8a8a8f]">di kaca: {applied === 0 ? "air suling" : pct(applied)}</span>
        </div>
        <span className="sr-only" aria-live="polite">{STATE_TEXT[state]}</span>
      </div>

      <LabStoryPanel panel={story.panel} />

      {/* phone: the same control at full size */}
      <div className="border-t border-[#efebf9] px-3 py-2.5 sm:hidden">
        <PhoneSlider label="Garam di pipet" value={salt} min={SALT.min} max={SALT.max} step={SALT.step} unit=" %" digits={2} locked={locked} onChange={changeSalt} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#efebf9] px-3 py-2.5 sm:px-4">
        {challenge.predict ? (
          <ChoiceChips
            label="Tebakanmu"
            options={[
              ["masuk", "Air masuk sel"],
              ["keluar", "Air keluar sel"],
              ["diam", "Tidak bergerak"],
            ]}
            value={guess}
            disabled={busy}
            onChange={setGuess}
          />
        ) : null}
        <span className="flex-1" />
        <FeedbackPill feedback={feedback} />
        <span data-lab-part="teteskan" className="inline-flex">
          <ActionButton onClick={drop} disabled={!canDrop}>
            <span className="flex items-center gap-1.5">
              <Droplet className={busy ? "size-4 animate-pulse" : "size-4"} aria-hidden="true" /> {busy ? "Mengamati…" : "Teteskan"}
            </span>
          </ActionButton>
        </span>
      </div>
      <LabPointer />
    </div>
  );
}

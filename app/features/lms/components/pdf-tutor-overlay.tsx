import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { MousePointer2 } from "lucide-react";
import { Bubble, BubbleContent } from "~/components/ui/bubble";
import {
  rotatePoint,
  pdfActionHoldSeconds,
  rotateRect,
  type PdfGuidance,
  type PdfCursorCue,
  type PdfPoint,
  type PdfSelection,
} from "../lib/pdf-tutor";
import { buildInkPlan } from "../lib/handwriting/ink-plan";

/** All drawing motion runs in original page units, with one projection for the PDF view. */
export function PdfTutorOverlay({
  guidance,
  cursorCue = null,
  selection,
  rotation,
  size,
  showCursor = true,
  pointerVisible = true,
  onPresentationTiming,
}: {
  guidance: PdfGuidance | null;
  cursorCue?: PdfCursorCue | null;
  selection: PdfSelection | null;
  showCursor?: boolean;
  pointerVisible?: boolean;
  onPresentationTiming?: (turnId: string, remainingMs: number) => void;
  rotation: number;
  size: { width: number; height: number };
}) {
  const root = useRef<HTMLDivElement>(null);
  const drawing = useRef<SVGGElement>(null);
  const hand = useRef<SVGGElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLSpanElement>(null);
  const cursorPosition = useRef<PdfPoint | null>(null);
  const previousCue = useRef<PdfCursorCue | null>(null);
  const timingRef = useRef(onPresentationTiming);
  timingRef.current = onPresentationTiming;
  const cueRef = useRef(cursorCue);
  cueRef.current = cursorCue;
  const playback = useRef<{
    guidance: PdfGuidance | null;
    progress: number[];
    finished: boolean;
    action: number;
    holds: number[];
  }>({ guidance: null, progress: [], finished: false, action: 0, holds: [] });
  const angle = ((rotation % 360) + 360) % 360;
  const originalWidth = angle % 180 === 0 ? size.width : size.height;
  const originalHeight = angle % 180 === 0 ? size.height : size.width;
  const pageHeight =
    Math.round((originalHeight / originalWidth) * 1_000_000) / 1000;
  const scale = originalWidth / 1000;
  const plan = useMemo(
    () => buildInkPlan(guidance, pageHeight),
    [guidance, pageHeight],
  );
  const matrix =
    angle === 90
      ? `matrix(0 ${scale} ${-scale} 0 ${size.width} 0)`
      : angle === 180
        ? `matrix(${-scale} 0 0 ${-scale} ${size.width} ${size.height})`
        : angle === 270
          ? `matrix(0 ${-scale} ${scale} 0 0 ${size.height})`
          : `matrix(${scale} 0 0 ${scale} 0 0)`;
  const first = guidance?.actions.find((action) => action.kind !== "text");
  const anchor = first
    ? rotatePoint(
        first.points?.[0] ?? {
          x: first.x + first.width / 2,
          y: first.y + first.height / 2,
        },
        angle,
      )
    : null;
  const selected = selection ? (selection.rects ?? [selection]).map((rect) => rotateRect(rect, angle)) : [];

  const placeCursor = (point: PdfPoint) => {
    cursorPosition.current = point;
    const screen = rotatePoint(point, angle);
    const element = cursor.current;
    if (!element) return;
    element.style.transform = `translate3d(${screen.x * size.width}px,${screen.y * size.height}px,0)`;
    element.dataset.x = String(point.x);
    element.dataset.y = String(point.y);
    if (bubble.current) {
      bubble.current.style.left = screen.x > 0.55 ? "auto" : "26px";
      bubble.current.style.right = screen.x > 0.55 ? "10px" : "auto";
      bubble.current.style.top = screen.y < 0.15 ? "28px" : "auto";
      bubble.current.style.bottom = screen.y < 0.15 ? "auto" : "20px";
    }
  };

  useLayoutEffect(() => {
    const host = root.current;
    const group = drawing.current;
    const pen = hand.current;
    if (!host || !group || !pen) return;
    const paths = [
      ...group.querySelectorAll<SVGPathElement>("[data-ink-stroke]"),
    ];
    const fallback = [
      ...group.querySelectorAll<SVGTextElement>("[data-ink-fallback]"),
    ];
    if (playback.current.guidance !== guidance) {
      playback.current = {
        guidance,
        progress: paths.map(() => 0),
        finished: false,
        action: 0,
        holds: guidance?.actions.map((_, index) => pdfActionHoldSeconds(guidance, index)) ?? [],
      };
    }
    const state = playback.current;
    const lengths = paths.map((path) => path.getTotalLength());
    paths.forEach((path, index) => {
      path.style.visibility =
        (state.progress[index] ?? 0) > 0 ? "visible" : "hidden";
      path.style.strokeDasharray = String(lengths[index]);
      path.style.strokeDashoffset = String(
        lengths[index] * (1 - (state.progress[index] ?? 0)),
      );
      path.dataset.progress = String(state.progress[index] ?? 0);
    });
    fallback.forEach((text) => {
      text.style.visibility = state.finished ? "visible" : "hidden";
    });
    pen.style.visibility = "hidden";
    if (!guidance) {
      host.dataset.inkState = "empty";
      return;
    }
    if (state.finished) {
      host.dataset.inkState = "complete";
      return;
    }
    if (!showCursor) {
      host.dataset.inkState = "paused";
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timeline: gsap.core.Timeline | null = null;
    const notifyTiming = () => {
      if (!cueRef.current) timingRef.current?.(guidance.turnId,
        Math.max(0, (timeline?.duration() ?? 0) - (timeline?.time() ?? 0)) * 1000);
    };
    const actionCaption = (index: number) => {
      state.action = index;
      if (cueRef.current) return;
      if (caption.current) caption.current.textContent = guidance.actions[index].caption ?? guidance.caption;
      if (cursor.current) cursor.current.dataset.action = String(index);
    };
    const appendHold = (index: number) => {
      if (index < 0 || !(state.holds[index] > 0)) return;
      const hold = { remaining: state.holds[index] };
      timeline!.to(hold, {
        remaining: 0, duration: hold.remaining, ease: "none",
        onStart: () => {
          actionCaption(index);
          pen.style.visibility = "hidden";
          host.dataset.pointerMode = "cursor";
          fallback.forEach((text) => { text.style.visibility = "visible"; });
          if (!cueRef.current && guidance.actions[index].kind !== "text" && !plan.strokes.some((stroke) => stroke.action === index)) {
            const action = guidance.actions[index];
            placeCursor(action.points?.[0] ?? { x: action.x + action.width / 2, y: action.y + action.height / 2 });
          }
          notifyTiming();
        },
        onUpdate: () => { state.holds[index] = hold.remaining; },
        onComplete: () => { state.holds[index] = 0; },
      });
    };
    const finish = () => {
      state.finished = true;
      host.dataset.inkState = "complete";
      pen.style.visibility = "hidden";
      paths.forEach((path, index) => {
        state.progress[index] = 1;
        path.style.visibility = "visible";
        path.style.strokeDashoffset = "0";
        path.dataset.progress = "1";
      });
      fallback.forEach((text) => {
        text.style.visibility = "visible";
      });
      notifyTiming();
      if (!cueRef.current) {
        state.action = guidance.actions.length - 1;
        if (caption.current) caption.current.textContent = guidance.actions[state.action].caption ?? guidance.caption;
        // Reduced motion and unsupported-only text still end at the relevant target.
        if (media.matches || !paths.length) {
          const last = [...guidance.actions].reverse().find((action) => action.kind !== "text");
          if (last) placeCursor(last.points?.at(-1) ?? { x: last.x + last.width / 2, y: last.y + last.height / 2 });
        }
      }
    };
    const placePen = (at: { x: number; y: number }, lifted = false) => {
      pen.setAttribute(
        "transform",
        `translate(${at.x} ${at.y}) rotate(${lifted ? -5 : 0})`,
      );
      pen.dataset.x = String(at.x);
      pen.dataset.y = String(at.y);
      if (!cueRef.current) placeCursor({ x: at.x / 1000, y: at.y / pageHeight });
    };
    const movePen = (path: SVGPathElement, length: number, progress: number) =>
      placePen(path.getPointAtLength(length * progress));
    const reduceMotion = () => {
      if (media.matches) {
        timeline?.kill();
        finish();
      }
    };
    if (media.matches) {
      finish();
      // Removing travel/drawing motion must not remove the model's reading time.
      timeline = gsap.timeline();
      guidance.actions.forEach((action, index) => {
        if (!(state.holds[index] > 0)) return;
        timeline!.call(() => {
          actionCaption(index);
          if (!cueRef.current && action.kind !== "text") placeCursor(action.points?.[0] ?? {
            x: action.x + action.width / 2, y: action.y + action.height / 2,
          });
        });
        appendHold(index);
      });
      notifyTiming();
      return () => { timeline?.kill(); };
    }
    host.dataset.inkState = "drawing";
    timeline = gsap.timeline({ onComplete: finish });
    // Cap pen motion independently: the model's holds must never be compressed
    // by the old ten-second cap for the entire batch.
    const durationFor = (index: number) => {
      const writing = plan.strokes[index].writing;
      return Math.max(writing ? 0.035 : 0.12,
        Math.min(writing ? 0.7 : 1.8, lengths[index] / (writing ? 300 : 550))) *
        (1 - (state.progress[index] ?? 0));
    };
    const inkScale = Math.max(1,
      (paths.reduce((total, _, index) => total + durationFor(index), 0) + paths.length * (0.16 + 0.025)) / 10);
    let previousTip: { x: number; y: number } | null = null;
    let previousAction = -1;
    paths.forEach((path, index) => {
      const action = plan.strokes[index].action;
      if (action !== previousAction) {
        for (let skipped = previousAction; skipped < action; skipped++) appendHold(skipped);
        previousAction = action;
      }
      const initial = state.progress[index] ?? 0;
      if (initial >= 1) return;
      const length = lengths[index];
      if (length <= 0) {
        state.progress[index] = 1;
        return;
      }
      const writing = plan.strokes[index].writing;
      const selecting = plan.strokes[index].kind === "highlight";
      const start = path.getPointAtLength(length * initial);
      if (previousTip) {
        const travel = { x: previousTip.x, y: previousTip.y };
        const distance = Math.hypot(start.x - travel.x, start.y - travel.y);
        if (distance > 1)
          timeline!.to(travel, {
            x: start.x,
            y: start.y,
            duration: Math.max(0.035, Math.min(0.16, distance / 1400)) / inkScale,
            ease: "power1.inOut",
            onStart: () => {
              host.dataset.pointerMode = selecting ? "selecting" : "ink";
              pen.style.visibility = selecting ? "hidden" : "visible";
              pen.dataset.penDown = "false";
            },
            onUpdate: () => placePen(travel, true),
          });
      }
      previousTip = path.getPointAtLength(length);
      const motion = { progress: initial };
      timeline!.to(
        motion,
        {
          progress: 1,
          duration: durationFor(index) / inkScale,
          ease: writing ? "sine.inOut" : "none",
          onStart: () => {
            const changed = state.action !== plan.strokes[index].action;
            actionCaption(plan.strokes[index].action);
            if (changed) notifyTiming();
            path.style.visibility = "visible";
            host.dataset.pointerMode = selecting ? "selecting" : "ink";
            pen.style.visibility = selecting ? "hidden" : "visible";
            pen.dataset.penDown = "true";
            movePen(path, length, initial);
          },
          onUpdate: () => {
            state.progress[index] = motion.progress;
            path.style.strokeDashoffset = String(
              length * (1 - motion.progress),
            );
            path.dataset.progress = String(motion.progress);
            movePen(path, length, motion.progress);
          },
          onComplete: () => {
            pen.dataset.penDown = "false";
          },
        },
        index ? `+=${0.025 / inkScale}` : 0,
      );
    });
    for (let remaining = previousAction; remaining < guidance.actions.length; remaining++) appendHold(remaining);
    notifyTiming();
    if (!timeline.duration()) finish();
    media.addEventListener("change", reduceMotion);
    return () => {
      timeline?.kill();
      media.removeEventListener("change", reduceMotion);
      pen.style.visibility = "hidden";
    };
  }, [guidance, plan, showCursor, angle, pageHeight, size.width, size.height]);

  useLayoutEffect(() => {
    const element = cursor.current;
    const cueChanged = previousCue.current !== cursorCue;
    previousCue.current = cursorCue;
    if (!element) return;
    const hasPosition = cursorPosition.current !== null;
    const from = getComputedStyle(element).transform;
    const state = playback.current;
    const action = guidance?.actions[state.action];
    const target = cursorCue ?? (
      state.finished || state.progress.some((value) => value > 0)
        ? cursorPosition.current
        : first?.points?.[0] ?? (first ? { x: first.x + first.width / 2, y: first.y + first.height / 2 } : null)
    );
    if (!target) return;
    placeCursor(target);
    if (caption.current) caption.current.textContent = cursorCue?.caption ?? action?.caption ?? guidance?.caption ?? "";
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (cursorCue && cueChanged) timingRef.current?.(cursorCue.turnId,
      (cursorCue.holdSeconds ?? 0) * 1000 + (hasPosition && !media.matches ? 200 : 0));
    // Independent cursor updates never restart the ink timeline. WAAPI retargets
    // from the current visual transform if another cue arrives during the move.
    if (!cursorCue || !cueChanged || !hasPosition || media.matches) return;
    const animation = element.animate([
      { transform: from }, { transform: element.style.transform },
    ], { duration: 200, easing: "cubic-bezier(0.77, 0, 0.175, 1)" });
    const reduce = () => { if (media.matches) animation.cancel(); };
    media.addEventListener("change", reduce);
    return () => {
      const position = getComputedStyle(element).transform;
      animation.cancel();
      element.style.transform = position;
      media.removeEventListener("change", reduce);
    };
  }, [cursorCue, guidance, showCursor, angle, size.width, size.height]);

  return (
    <div
      ref={root}
      className="pdf-tutor-overlay pointer-events-none absolute inset-0"
      data-testid="pdf-annotation-layer"
      data-ink-state="empty"
      data-external-cursor={!!cursorCue}
    >
      <svg
        className="absolute inset-0 size-full overflow-visible text-[color:var(--pdf-tutor-ink)]"
        viewBox={`0 0 ${size.width} ${size.height}`}
        aria-label="Anotasi tutor"
        role="img"
      >
        {selected.map((rect, index) => (
          <rect
            key={index}
            data-testid="pdf-selection"
            x={rect.x * size.width}
            y={rect.y * size.height}
            width={Math.max(5, rect.width * size.width)}
            height={Math.max(5, rect.height * size.height)}
            fill="var(--secondary)"
            fillOpacity="0.12"
            stroke="var(--pdf-tutor-ink)"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            rx="3"
          />
        ))}
        <g transform={matrix}>
          <g
            ref={drawing}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {guidance?.actions.map((action, actionIndex) => action.placement === "side" ? null : (
              <g
                key={actionIndex}
                data-testid={action.kind === "text" ? "tutor-note" : undefined}
                role="img"
                aria-label={
                  action.kind === "text"
                    ? action.text
                    : `Anotasi ${action.kind}`
                }
              >
                <title>{action.text ?? `Anotasi ${action.kind}`}</title>
                {plan.strokes.map((stroke, index) =>
                  stroke.action === actionIndex ? (
                    <path
                      key={index}
                      d={stroke.d}
                      data-ink-stroke={index}
                      data-stroke-kind={stroke.kind}
                      data-testid={
                        stroke.kind === "highlight"
                          ? "tutor-highlight"
                          : stroke.kind === "rectangle"
                            ? "tutor-rectangle"
                            : undefined
                      }
                      strokeLinecap={stroke.kind === "highlight" ? "butt" : "round"}
                      strokeWidth={stroke.width}
                      strokeOpacity={stroke.opacity}
                      stroke={
                        stroke.kind === "highlight"
                          ? "var(--brand-lavender)"
                          : "currentColor"
                      }
                      style={{ visibility: "hidden" }}
                    />
                  ) : null,
                )}
                {plan.fallbacks
                  .filter((item) => item.action === actionIndex)
                  .map((item, index) => (
                    <text
                      key={index}
                      data-ink-fallback=""
                      x={item.x}
                      y={item.y}
                      fontSize={item.size}
                      fontFamily="inherit"
                      stroke="none"
                      fill="currentColor"
                      style={{ visibility: "hidden" }}
                    >
                      {item.text}
                    </text>
                  ))}
              </g>
            ))}
          </g>
          <g
            ref={hand}
            data-testid="tutor-drawing-hand"
            aria-hidden="true"
            style={{ visibility: "hidden" }}
          >
            <g transform="rotate(-12)">
              {/* Nib is precisely (0,0). The stylized hand holds the pen above it. */}
              <path
                d="M0 0 6-15 27-42 Q29-44 32-42 L35-39 Q37-37 34-34 L13-8Z"
                fill="var(--pdf-tutor-ink)"
                stroke="var(--pdf-tutor-ink)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path
                d="M0 0 6-15 13-8Z"
                fill="var(--card)"
                stroke="var(--pdf-tutor-ink)"
                strokeWidth="1.2"
              />
              <path
                d="M5-4 9-9"
                stroke="var(--pdf-tutor-ink)"
                strokeWidth="2"
              />
              <path
                d="M23-35 29-30"
                stroke="var(--secondary)"
                strokeWidth="3"
              />
              <path
                d="M16-24 Q18-29 22-26 L37-16 Q40-15 41-12 L49 4 58 12 44 29 30 18 Q24 14 22 8 L13-9 Q11-14 15-16 18-18 21-12 L27-3 29-5 19-17 Q14-19 16-24Z"
                fill="var(--brand-lavender-soft)"
                stroke="var(--pdf-tutor-ink)"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M23-23 34-13 M27-19 36-10 M29-5 34 2 M21-12 25-5"
                fill="none"
                stroke="var(--pdf-tutor-ink)"
                strokeOpacity="0.65"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
              <path
                d="M42 24 55 9 67 20 53 36Z"
                fill="var(--secondary)"
                stroke="var(--pdf-tutor-ink)"
                strokeWidth="1.6"
              />
            </g>
          </g>
        </g>
      </svg>
      {pointerVisible && (cursorCue || (anchor && guidance && showCursor)) ? (
        <div
          ref={cursor}
          data-testid="tutor-cursor"
          className="absolute top-0 left-0"
        >
          <MousePointer2
            data-tutor-pointer=""
            className="size-6 fill-secondary text-[color:var(--pdf-tutor-ink)] drop-shadow-sm"
            aria-hidden="true"
          />
          <div
            ref={bubble}
            className="absolute w-max max-w-[min(15rem,50vw)]"
            style={{
              left: 26,
              top: 24,
            }}
          >
            <Bubble variant="secondary" className="max-w-full">
              <BubbleContent>
                <span className="block text-[10px] font-semibold tracking-wider uppercase">
                  NALAR · hal. {cursorCue?.page ?? guidance?.page}
                </span>
                <span ref={caption} data-testid="tutor-cursor-caption">{cursorCue?.caption ?? guidance?.caption}</span>
              </BubbleContent>
            </Bubble>
          </div>
        </div>
      ) : null}
    </div>
  );
}

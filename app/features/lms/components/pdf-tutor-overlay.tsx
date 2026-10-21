import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { MousePointer2 } from "lucide-react";
import { Bubble, BubbleContent } from "~/components/ui/bubble";
import {
  rotatePoint,
  rotateRect,
  type PdfGuidance,
  type PdfSelection,
} from "../lib/pdf-tutor";
import { buildInkPlan } from "../lib/handwriting/ink-plan";

/** All drawing motion runs in original page units, with one projection for the PDF view. */
export function PdfTutorOverlay({
  guidance,
  selection,
  rotation,
  size,
  showCursor = true,
}: {
  guidance: PdfGuidance | null;
  selection: PdfSelection | null;
  showCursor?: boolean;
  rotation: number;
  size: { width: number; height: number };
}) {
  const root = useRef<HTMLDivElement>(null);
  const drawing = useRef<SVGGElement>(null);
  const hand = useRef<SVGGElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const playback = useRef<{
    guidance: PdfGuidance | null;
    progress: number[];
    finished: boolean;
  }>({ guidance: null, progress: [], finished: false });
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
  const first = guidance?.actions[0];
  const anchor = first
    ? rotatePoint(
        first.points?.[0] ?? {
          x: first.x + first.width / 2,
          y: first.y + first.height / 2,
        },
        angle,
      )
    : null;
  const selected = selection ? rotateRect(selection, angle) : null;

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
    };
    const placePen = (at: { x: number; y: number }, lifted = false) => {
      pen.setAttribute(
        "transform",
        `translate(${at.x} ${at.y}) rotate(${lifted ? -5 : 0})`,
      );
      pen.dataset.x = String(at.x);
      pen.dataset.y = String(at.y);
      if (cursor.current) {
        const screen = rotatePoint(
          { x: at.x / 1000, y: at.y / pageHeight },
          angle,
        );
        cursor.current.style.transform = `translate3d(${screen.x * size.width}px,${screen.y * size.height}px,0)`;
        if (bubble.current) {
          bubble.current.style.left = screen.x > 0.55 ? "auto" : "26px";
          bubble.current.style.right = screen.x > 0.55 ? "10px" : "auto";
          bubble.current.style.top = screen.y < 0.15 ? "28px" : "auto";
          bubble.current.style.bottom = screen.y < 0.15 ? "auto" : "20px";
        }
      }
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
      return;
    }
    host.dataset.inkState = "drawing";
    timeline = gsap.timeline({ onComplete: finish });
    let previousTip: { x: number; y: number } | null = null;
    paths.forEach((path, index) => {
      const initial = state.progress[index] ?? 0;
      if (initial >= 1) return;
      const length = lengths[index];
      if (length <= 0) {
        state.progress[index] = 1;
        return;
      }
      const writing = plan.strokes[index].writing;
      const start = path.getPointAtLength(length * initial);
      if (previousTip) {
        const travel = { x: previousTip.x, y: previousTip.y };
        const distance = Math.hypot(start.x - travel.x, start.y - travel.y);
        if (distance > 1)
          timeline!.to(travel, {
            x: start.x,
            y: start.y,
            duration: Math.max(0.035, Math.min(0.16, distance / 1400)),
            ease: "power1.inOut",
            onStart: () => {
              pen.style.visibility = "visible";
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
          duration:
            Math.max(
              writing ? 0.035 : 0.12,
              Math.min(writing ? 0.7 : 1.8, length / (writing ? 300 : 550)),
            ) *
            (1 - initial),
          ease: writing ? "sine.inOut" : "none",
          onStart: () => {
            path.style.visibility = "visible";
            pen.style.visibility = "visible";
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
        index ? "+=0.025" : 0,
      );
    });
    // Keep a long note from holding a teaching step open for too long.
    timeline.timeScale(Math.max(1, timeline.duration() / 10));
    if (!paths.length) finish();
    media.addEventListener("change", reduceMotion);
    return () => {
      timeline?.kill();
      media.removeEventListener("change", reduceMotion);
      pen.style.visibility = "hidden";
    };
  }, [guidance, plan, showCursor, angle, pageHeight, size.width, size.height]);

  return (
    <div
      ref={root}
      className="pdf-tutor-overlay pointer-events-none absolute inset-0"
      data-testid="pdf-annotation-layer"
      data-ink-state="empty"
    >
      <svg
        className="absolute inset-0 size-full overflow-visible text-[color:var(--pdf-tutor-ink)]"
        viewBox={`0 0 ${size.width} ${size.height}`}
        aria-label="Anotasi tutor"
        role="img"
      >
        {selected ? (
          <rect
            data-testid="pdf-selection"
            x={selected.x * size.width}
            y={selected.y * size.height}
            width={Math.max(5, selected.width * size.width)}
            height={Math.max(5, selected.height * size.height)}
            fill="var(--secondary)"
            fillOpacity="0.12"
            stroke="var(--pdf-tutor-ink)"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            rx="3"
          />
        ) : null}
        <g transform={matrix}>
          <g
            ref={drawing}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {guidance?.actions.map((action, actionIndex) => (
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
      {anchor && guidance && showCursor ? (
        <div
          ref={cursor}
          data-testid="tutor-cursor"
          className="absolute top-0 left-0"
          style={{
            transform: `translate3d(${anchor.x * size.width}px,${anchor.y * size.height}px,0)`,
          }}
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
              left: anchor.x > 0.55 ? "auto" : 26,
              right: anchor.x > 0.55 ? 10 : "auto",
              top: anchor.y > 0.75 ? "auto" : 24,
              bottom: anchor.y > 0.75 ? 20 : "auto",
            }}
          >
            <Bubble variant="secondary" className="max-w-full">
              <BubbleContent>
                <span className="block text-[10px] font-semibold tracking-wider uppercase">
                  NALAR · hal. {guidance.page}
                </span>
                <span>{guidance.caption}</span>
              </BubbleContent>
            </Bubble>
          </div>
        </div>
      ) : null}
    </div>
  );
}

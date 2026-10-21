import { useId } from "react";
import { MousePointer2 } from "lucide-react";
import { Bubble, BubbleContent } from "~/components/ui/bubble";
import { cn } from "~/lib/utils";
import {
  rotatePoint,
  rotateRect,
  type PdfGuidance,
  type PdfSelection,
} from "../lib/pdf-tutor";

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
  const markerId = useId().replace(/:/g, "");
  const point = (p: { x: number; y: number }) => {
    const rotated = rotatePoint(p, rotation);
    return { x: rotated.x * size.width, y: rotated.y * size.height };
  };
  const first = guidance?.actions[0];
  const cursor = first
    ? rotatePoint(
        first.points?.[0] ?? {
          x: first.x + first.width / 2,
          y: first.y + first.height / 2,
        },
        rotation,
      )
    : null;
  const selected = selection ? rotateRect(selection, rotation) : null;
  return (
    <div
      className="pdf-tutor-overlay pointer-events-none absolute inset-0"
      data-testid="pdf-annotation-layer"
    >
      <svg
        className="absolute inset-0 size-full overflow-visible text-[color:var(--pdf-tutor-ink)]"
        viewBox={`0 0 ${size.width} ${size.height}`}
        aria-label="Anotasi tutor"
        role="img"
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
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
        {guidance?.actions.map((action, index) => {
          const bounds = rotateRect(action, rotation);
          const x = bounds.x * size.width;
          const y = bounds.y * size.height;
          const width = bounds.width * size.width;
          const height = bounds.height * size.height;
          const common = {
            stroke: "currentColor",
            strokeWidth: 2.5,
            fill: "none",
            strokeLinecap: "round" as const,
            strokeLinejoin: "round" as const,
          };
          if (action.kind === "point") {
            const p = point(action);
            return (
              <circle
                key={index}
                cx={p.x}
                cy={p.y}
                r="7"
                {...common}
                fill="var(--secondary)"
                fillOpacity="0.4"
              />
            );
          }
          if (action.kind === "highlight")
            return (
              <rect
                key={index}
                data-testid="tutor-highlight"
                x={x - 2}
                y={y - 2}
                width={width + 4}
                height={height + 4}
                rx="3"
                fill="var(--secondary)"
                fillOpacity="0.3"
                stroke="currentColor"
                strokeWidth="1"
              />
            );
          if (action.kind === "rectangle")
            return (
              <rect
                key={index}
                x={x}
                y={y}
                width={width}
                height={height}
                rx="5"
                {...common}
              />
            );
          if (action.kind === "ellipse")
            return (
              <ellipse
                key={index}
                cx={x + width / 2}
                cy={y + height / 2}
                rx={width / 2}
                ry={height / 2}
                {...common}
              />
            );
          if (action.kind === "arrow") {
            const a = point(action.points?.[0] ?? action);
            const b = point(
              action.points?.[1] ?? {
                x: action.x + action.width,
                y: action.y + action.height,
              },
            );
            return (
              <line
                key={index}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                markerEnd={`url(#${markerId})`}
                {...common}
              />
            );
          }
          if (action.kind === "path")
            return (
              <polyline
                key={index}
                points={action.points
                  ?.map((p) => {
                    const at = point(p);
                    return `${at.x},${at.y}`;
                  })
                  .join(" ")}
                {...common}
              />
            );
          if (action.kind === "text") {
            const at = point(action);
            const words = action.text?.match(/.{1,28}(?:\s|$)|.{1,28}/g) ?? [];
            return (
              <text
                key={index}
                x={at.x}
                y={at.y}
                fill="currentColor"
                fontFamily="inherit"
                fontSize={Math.max(11, Math.min(18, size.width * 0.025))}
                fontWeight="600"
                stroke="white"
                strokeWidth="3"
                paintOrder="stroke"
                data-testid="tutor-note"
              >
                {words.map((line, i) => (
                  <tspan key={i} x={at.x} dy={i ? "1.3em" : "0"}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          }
          return null;
        })}
      </svg>
      {cursor && guidance && showCursor ? (
        <div
          data-testid="tutor-cursor"
          className="absolute top-0 left-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out"
          style={{
            transform: `translate3d(${cursor.x * size.width}px, ${cursor.y * size.height}px, 0)`,
          }}
        >
          <MousePointer2
            className="size-6 fill-secondary text-[color:var(--pdf-tutor-ink)] drop-shadow-sm"
            aria-hidden="true"
          />
          <div
            className={cn(
              "absolute w-max max-w-[min(15rem,50vw)]",
              cursor.x > 0.55 ? "right-2" : "left-5",
              cursor.y > 0.75 ? "bottom-5" : "top-5",
            )}
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

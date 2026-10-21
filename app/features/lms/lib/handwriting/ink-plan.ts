import glyphs from "./hershey-cursive";
import type { PdfAction, PdfGuidance, PdfPoint } from "../pdf-tutor";

export type InkStroke = {
  d: string;
  width: number;
  opacity: number;
  action: number;
  kind: PdfAction["kind"];
  /** Text strokes are measured and timed at writing speed, shapes at drawing speed. */
  writing: boolean;
};
export type InkFallback = {
  text: string;
  x: number;
  y: number;
  size: number;
  action: number;
};
export type InkPlan = {
  strokes: InkStroke[];
  fallbacks: InkFallback[];
  notes: Array<{ action: number; text: string }>;
};
const p = (x: number, y: number) =>
  `${Number(x.toFixed(3))},${Number(y.toFixed(3))}`;

// Additional single-line symbols used in Indonesian learning material. No outline tracing.
const symbols: Record<
  string,
  { d: string; o: number; scale?: number; dy?: number }
> = {
  "×": { d: "M4,5 L20,21 M20,5 L4,21", o: 12 },
  "÷": { d: "M3,13 L23,13 M12,4 L13,4 M12,22 L13,22", o: 13 },
  "−": { d: "M3,13 L23,13", o: 13 },
  "±": { d: "M3,10 L23,10 M13,1 L13,19 M3,24 L23,24", o: 13 },
  π: {
    d: "M2,7 L7,5 15,5 24,7 M7,6 L5,22 M19,6 L17,19 18,22 20,23 23,20",
    o: 13,
  },
  "√": { d: "M0,14 L5,11 L10,24 L17,0 L28,0", o: 15 },
  "≤": { d: "M22,2 L3,11 L22,20 M3,25 L22,25", o: 13 },
  "≥": { d: "M3,2 L22,11 L3,20 M3,25 L22,25", o: 13 },
  "≠": { d: "M3,9 L23,9 M3,17 L23,17 M19,1 L7,25", o: 13 },
  "→": { d: "M2,13 L26,13 M18,5 L26,13 L18,21", o: 14 },
  "∞": {
    d: "M14,13 L8,5 4,4 1,7 0,13 2,19 6,21 10,19 14,13 18,7 22,5 26,7 28,13 27,19 24,22 20,21 14,13",
    o: 15,
  },
  "°": { d: "M8,2 L11,3 12,6 11,9 8,10 5,9 4,6 5,3 8,2", o: 6 },
  "²": { ...glyphs["2".charCodeAt(0) - 33], scale: 0.65, dy: -6 },
  "³": { ...glyphs["3".charCodeAt(0) - 33], scale: 0.65, dy: -6 },
  "“": glyphs['"'.charCodeAt(0) - 33],
  "”": glyphs['"'.charCodeAt(0) - 33],
  "‘": glyphs["'".charCodeAt(0) - 33],
  "’": glyphs["'".charCodeAt(0) - 33],
  "–": glyphs["-".charCodeAt(0) - 33],
  "—": glyphs["-".charCodeAt(0) - 33],
};

function glyphFor(char: string) {
  return (
    symbols[char] ??
    (char >= "!" && char <= "~" ? glyphs[char.charCodeAt(0) - 33] : null)
  );
}

/** Every pen-down subpath is independent, so dots/crossbars use an actual pen lift. */
export function handwritingPaths(
  text: string,
  maxWidth: number,
  fontSize = 32,
) {
  const scale = fontSize / 21;
  const lineHeight = fontSize * 1.55;
  const paths: string[] = [];
  const fallback: Omit<InkFallback, "action">[] = [];
  let x = 0;
  let y = 0;
  let previousX = 0;
  const advance = (char: string) => {
    if (/\s/.test(char)) return 12 * scale;
    const glyph = glyphFor(char);
    return glyph
      ? glyph.o * 2 * scale * ("scale" in glyph ? Number(glyph.scale) : 1)
      : fontSize;
  };
  // Preserve supported math glyphs (for example ≠); NFD would turn them into
  // a base sign plus a combining mark and change the meaning if that mark fell back.
  const normalized = [...text]
    .map((char) => (glyphFor(char) ? char : char.normalize("NFD")))
    .join("");
  for (const token of normalized.split(/(\s+)/)) {
    const wordWidth = [...token].reduce(
      (sum, char) => sum + (/[\u0300-\u036f]/.test(char) ? 0 : advance(char)),
      0,
    );
    if (!/^\s+$/.test(token) && x > 0 && x + wordWidth > maxWidth) {
      x = 0;
      y += lineHeight;
    }
    for (const char of token) {
      if (char === "\n") {
        x = 0;
        y += lineHeight;
        continue;
      }
      if (/\s/.test(char)) {
        if (x > 0) x += advance(char);
        continue;
      }
      // Common Latin diacritics keep their own stroke above the previous letter.
      if (/[\u0300-\u036f]/.test(char)) {
        const cx = previousX + fontSize * 0.35;
        const cy = y - fontSize * 1.08;
        const d =
          char === "\u0301"
            ? `M${p(cx, cy)} L${p(cx + 5 * scale, cy - 4 * scale)}`
            : char === "\u0300"
              ? `M${p(cx, cy)} L${p(cx - 5 * scale, cy - 4 * scale)}`
              : char === "\u0302"
                ? `M${p(cx - 4 * scale, cy)} L${p(cx, cy - 4 * scale)} ${p(cx + 4 * scale, cy)}`
                : char === "\u0308"
                  ? `M${p(cx - 3 * scale, cy)} L${p(cx - 3 * scale + 0.3, cy)} M${p(cx + 3 * scale, cy)} L${p(cx + 3 * scale + 0.3, cy)}`
                  : null;
        if (d) paths.push(...d.match(/M[^M]+/g)!);
        else fallback.push({ text: char, x: previousX, y, size: fontSize });
        continue;
      }
      const width = advance(char);
      if (x > 0 && x + width > maxWidth) {
        x = 0;
        y += lineHeight;
      }
      const glyph = glyphFor(char);
      if (glyph) {
        const glyphScale = scale * ("scale" in glyph ? Number(glyph.scale) : 1);
        const dy = "dy" in glyph ? Number(glyph.dy) * scale : 0;
        // Keep the path commands, transform only numeric coordinate pairs.
        const transformed = glyph.d.replace(
          /(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
          (_match, gx: string, gy: string) =>
            p(
              x + Number(gx) * glyphScale,
              y - fontSize + Number(gy) * glyphScale + dy,
            ),
        );
        paths.push(...(transformed.match(/M[^M]+/g) ?? []));
      } else {
        // Preserve unsupported characters visibly rather than silently dropping them.
        fallback.push({ text: char, x, y, size: fontSize });
      }
      previousX = x;
      x += width;
    }
  }
  return { paths, fallback, height: y + lineHeight, lineHeight };
}

/** Pure geometry in a fixed 1000-unit original page, independent of zoom/rotation. */
export function buildInkPlan(
  guidance: PdfGuidance | null,
  pageHeight: number,
): InkPlan {
  const plan: InkPlan = { strokes: [], fallbacks: [], notes: [] };
  if (!guidance) return plan;
  const at = (point: PdfPoint) => ({
    x: point.x * 1000,
    y: point.y * pageHeight,
  });
  const add = (
    d: string,
    action: number,
    kind: PdfAction["kind"],
    width = 3,
    opacity = 1,
  ) =>
    plan.strokes.push({
      d,
      action,
      kind,
      width,
      opacity,
      writing: kind === "text",
    });
  guidance.actions.forEach((action, index) => {
    const { x, y } = at(action);
    const w = action.width * 1000;
    const h = action.height * pageHeight;
    if (action.kind === "rectangle")
      add(`M${p(x, y)} h${w} v${h} h${-w} Z`, index, action.kind);
    if (action.kind === "ellipse" || action.kind === "point") {
      const rx = action.kind === "point" ? 8 : w / 2;
      const ry = action.kind === "point" ? 8 : h / 2;
      const cx = action.kind === "point" ? x : x + rx;
      const cy = action.kind === "point" ? y : y + ry;
      add(
        `M${p(cx, cy - ry)} A${rx},${ry} 0 1 1 ${p(cx, cy + ry)} A${rx},${ry} 0 1 1 ${p(cx, cy - ry)}`,
        index,
        action.kind,
      );
    }
    if (action.kind === "highlight")
      add(
        `M${p(x, y + h / 2)} Q${p(x + w / 2, y + h / 2 - Math.min(2, h * 0.08))} ${p(x + w, y + h / 2)}`,
        index,
        action.kind,
        Math.max(h + 3, 5),
        0.3,
      );
    if (action.kind === "arrow") {
      const a = at(action.points?.[0] ?? action);
      const b = at(
        action.points?.[1] ?? {
          x: action.x + action.width,
          y: action.y + action.height,
        },
      );
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const head = Math.min(17, Math.hypot(b.x - a.x, b.y - a.y) * 0.3);
      add(`M${p(a.x, a.y)} L${p(b.x, b.y)}`, index, action.kind);
      for (const side of [-1, 1])
        add(
          `M${p(b.x - head * Math.cos(angle + side * 0.5), b.y - head * Math.sin(angle + side * 0.5))} L${p(b.x, b.y)}`,
          index,
          action.kind,
        );
    }
    if (action.kind === "path")
      add(
        action
          .points!.map((point, index) => {
            const a = at(point);
            return `${index ? "L" : "M"}${p(a.x, a.y)}`;
          })
          .join(" "),
        index,
        action.kind,
      );
    if (action.kind === "text" && action.text) {
      const available = Math.max(
        100,
        Math.min(action.width > 0 ? w : 540, 970 - Math.min(x, 860)),
      );
      const startX = Math.min(x, 970 - available);
      const text = handwritingPaths(action.text, available);
      const baseline = Math.max(40, Math.min(y, pageHeight - text.height - 15));
      // Translate all text paths using an enclosing group in the renderer.
      const translate = (d: string) =>
        d.replace(
          /(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
          (_match, sx: string, sy: string) =>
            p(startX + Number(sx), baseline + Number(sy)),
        );
      text.paths.forEach((d) => add(translate(d), index, action.kind, 2.4));
      text.fallback.forEach((f) =>
        plan.fallbacks.push({
          ...f,
          x: f.x + startX,
          y: f.y + baseline,
          action: index,
        }),
      );
      plan.notes.push({ action: index, text: action.text });
    }
  });
  return plan;
}

/** All coordinates are relative to the original, unrotated PDF crop box. */
export type PdfPoint = { x: number; y: number };
export type PdfRect = PdfPoint & { width: number; height: number };
export type PdfBlock = PdfRect & { id: string; text: string };
export type PdfSelection = PdfRect & { text: string; rects?: PdfRect[] };
export type PdfViewContext = {
  resourceId: string;
  fingerprint: string;
  page: number;
  totalPages: number;
  revision: number;
  viewport: PdfRect;
  selection: PdfSelection | null;
  blocks: PdfBlock[];
  /** A clean image without the annotation layer, in the original orientation. */
  image: string;
  /** Local DOM measurement; never serialized to the provider. */
  resolveTextRange?: (blockId: string, start: number, end: number) => PdfRect[];
};
export type PdfAction = PdfRect & {
  kind:
    "point" | "highlight" | "arrow" | "rectangle" | "ellipse" | "text" | "path";
  caption?: string;
  holdSeconds?: number;
  /** The first words the tutor says about this step; the step appears when they are heard. */
  say?: string;
  text?: string;
  /** Written notes live beside the document so they cannot obscure its content. */
  placement?: "side";
  points?: PdfPoint[];
  rects?: PdfRect[];
};
export type PdfGuidance = {
  resourceId: string;
  page: number;
  turnId: string;
  caption: string;
  holdSeconds?: number;
  actions: PdfAction[];
};

export type PdfCursorCue = Omit<PdfGuidance, "actions"> & PdfPoint;

/** Cursor-only steps use the same checks as annotations. */
export function parsePdfCursor(raw: unknown, context: PdfViewContext, turnId: string): PdfCursorCue {
  if (!record(raw)) throw new Error("Target cursor tidak valid.");
  const guidance = parsePdfGuidance({ ...raw, actions: [{
    kind: "point", blockId: raw.blockId, x: raw.x, y: raw.y,
  }] }, context, turnId);
  const { actions, ...identity } = guidance;
  return { ...identity, x: actions[0].x, y: actions[0].y };
}

/** Durations are supplied by the model; one it got wrong just means the default reading time. */
export function parsePdfHoldSeconds(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 20 ? value : undefined;
}

/** Steps follow the tutor's words instead of fixed reading times. */
export function pdfGuidanceFollowsSpeech(guidance: PdfGuidance | null) {
  return !!guidance?.actions.some((action) => action.say);
}

/** Where the tutor's hand is now: the step its words have reached, or a lone cursor cue. */
export function pdfPointerTarget(
  guidance: PdfGuidance | null,
  revealedSteps: number | null,
  cursorCue: PdfCursorCue | null,
  page: number,
): PdfPoint | null {
  if (cursorCue?.page === page) return { x: cursorCue.x, y: cursorCue.y };
  if (guidance?.page !== page) return null;
  const onPage = guidance.actions.filter((action, index) =>
    action.kind !== "text" && (revealedSteps === null || index < revealedSteps));
  const action = revealedSteps === null ? onPage[0] : onPage.at(-1);
  if (!action) return null;
  return action.points?.[0] ?? { x: action.x + action.width / 2, y: action.y + action.height / 2 };
}

/**
 * How far to scroll so a spot on the page comes into view, or null when it is in view already.
 * `at` is the spot's position inside the scroll area's visible box, `size` that box's length.
 * The spot lands in the upper part, clear of the bubble that may sit at the bottom.
 */
export function pdfScrollDelta(at: number, size: number) {
  if (at >= size * 0.12 && at <= size * 0.72) return null;
  return at - size * 0.35;
}

export function pdfActionHoldSeconds(guidance: PdfGuidance, index: number) {
  const action = guidance.actions[index];
  return action.holdSeconds ?? (action.caption || index === guidance.actions.length - 1 ? guidance.holdSeconds ?? 0 : 0);
}

const unit = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export const clampUnit = (v: number) => Math.max(0, Math.min(1, v));

export function rotatePoint(point: PdfPoint, rotation: number): PdfPoint {
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return { x: 1 - point.y, y: point.x };
    case 180:
      return { x: 1 - point.x, y: 1 - point.y };
    case 270:
      return { x: point.y, y: 1 - point.x };
    default:
      return { ...point };
  }
}

export function rotateRect(rect: PdfRect, rotation: number): PdfRect {
  const corners = [
    rotatePoint(rect, rotation),
    rotatePoint({ x: rect.x + rect.width, y: rect.y + rect.height }, rotation),
  ];
  const x = Math.min(corners[0].x, corners[1].x);
  const y = Math.min(corners[0].y, corners[1].y);
  return {
    x,
    y,
    width: Math.abs(corners[1].x - corners[0].x),
    height: Math.abs(corners[1].y - corners[0].y),
  };
}

export function intersects(a: PdfRect, b: PdfRect) {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

/** Longest text the model may hand over; anything longer is cut, not refused. */
const shorten = (value: unknown, length: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, length) : undefined;

function parseAction(value: unknown, context: PdfViewContext): PdfAction {
  if (
    !record(value) ||
    ![
      "point",
      "highlight",
      "arrow",
      "rectangle",
      "ellipse",
      "text",
      "path",
    ].includes(String(value.kind))
  )
    throw new Error("Jenis tindakan tidak valid.");
  const kind = value.kind as PdfAction["kind"];
  const holdSeconds = parsePdfHoldSeconds(value.holdSeconds);
  const caption = shorten(value.caption, 120);
  const say = shorten(value.say, 80);
  const block = context.blocks.find((b) => b.id === value.blockId) ?? null;
  let rects: PdfRect[] | undefined;
  if (block && kind === "highlight" && (value.quote !== undefined || value.startOffset !== undefined)) {
    const start = typeof value.quote === "string" ? block.text.indexOf(value.quote) : value.startOffset;
    const end = typeof value.quote === "string" && typeof start === "number"
      ? start + value.quote.length : value.endOffset;
    // Words the model misquoted, or a text layer still being redrawn: the whole block it named
    // is the next best thing, so the step still shows.
    if (typeof start === "number" && typeof end === "number" && Number.isInteger(start) &&
        Number.isInteger(end) && start >= 0 && end > start && end <= block.text.length) {
      const measured = context.resolveTextRange?.(block.id, start, end);
      if (measured?.length) rects = measured;
    }
  }
  let points: PdfPoint[] | undefined;
  if (kind === "path" || (kind === "arrow" && value.points !== undefined)) {
    if (
      !Array.isArray(value.points) ||
      value.points.length < 2 ||
      value.points.length > (kind === "arrow" ? 2 : 40)
    )
      throw new Error("Jumlah titik garis tidak valid.");
    points = value.points.map((p) => {
      if (!record(p) || !unit(p.x) || !unit(p.y))
        throw new Error("Titik garis di luar halaman.");
      return { x: p.x, y: p.y };
    });
  }
  const pathBox = points
    ? {
        x: Math.min(...points.map((p) => p.x)),
        y: Math.min(...points.map((p) => p.y)),
        width:
          Math.max(...points.map((p) => p.x)) -
          Math.min(...points.map((p) => p.x)),
        height:
          Math.max(...points.map((p) => p.y)) -
          Math.min(...points.map((p) => p.y)),
      }
    : null;
  const rangeBox = rects ? {
    x: Math.min(...rects.map((r) => r.x)),
    y: Math.min(...rects.map((r) => r.y)),
    width: Math.max(...rects.map((r) => r.x + r.width)) - Math.min(...rects.map((r) => r.x)),
    height: Math.max(...rects.map((r) => r.y + r.height)) - Math.min(...rects.map((r) => r.y)),
  } : null;
  const rect = rangeBox ?? pathBox ??
    block ?? {
      x: kind === "text" ? 0 : value.x,
      y: kind === "text" ? 0 : value.y,
      width: value.width ?? 0,
      height: value.height ?? 0,
    };
  if (![rect.x, rect.y, rect.width, rect.height].every(unit))
    throw new Error("Target tidak ada di halaman ini. Panggil get_pdf_context, lalu ulangi sekali.");
  const box =
    kind === "point" && block
      ? {
          x: block.x + block.width / 2,
          y: block.y + block.height / 2,
          width: 0,
          height: 0,
        }
      : (rect as PdfRect);
  if (box.x + box.width > 1.001 || box.y + box.height > 1.001)
    throw new Error("Tindakan keluar dari halaman.");
  if (
    ["highlight", "rectangle", "ellipse"].includes(kind) &&
    (box.width <= 0 || box.height <= 0)
  )
    throw new Error("Ukuran tindakan kosong.");
  if (kind === "arrow" && box.width === 0 && box.height === 0)
    throw new Error("Panah harus memiliki panjang.");
  const text = kind === "text" ? shorten(value.text, 100) : undefined;
  if (kind === "text" && !text) throw new Error("Catatan harus berisi teks.");
  return {
    kind,
    ...(caption !== undefined ? { caption } : {}),
    ...(holdSeconds !== undefined ? { holdSeconds } : {}),
    ...(say !== undefined ? { say } : {}),
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    ...(text !== undefined ? { text, placement: "side" as const } : {}),
    ...(points ? { points } : {}),
    ...(rects ? { rects } : {}),
  };
}

/**
 * Model output is untrusted, so nothing it sends reaches the page unchecked. But a teacher who
 * fumbles one step keeps pointing: a bad step is left out and the others stay. Only a plan for
 * a page the student no longer has open, or one with no usable step, is refused. Coordinates
 * are relative to the page, so scrolling, zooming or selecting never invalidates a plan.
 */
export function parsePdfGuidance(
  raw: unknown,
  context: PdfViewContext,
  turnId: string,
): PdfGuidance {
  if (!record(raw) || raw.page !== context.page)
    throw new Error("Halaman yang dibuka siswa sudah berubah. Panggil get_pdf_context, lalu ulangi sekali.");
  if (!Array.isArray(raw.actions) || !raw.actions.length)
    throw new Error("Tidak ada tindakan untuk ditampilkan.");
  const actions: PdfAction[] = [];
  let firstError: unknown = null;
  for (const value of raw.actions.slice(0, 8)) {
    try {
      actions.push(parseAction(value, context));
    } catch (error) {
      firstError ??= error;
    }
  }
  if (!actions.length) throw firstError;
  const holdSeconds = parsePdfHoldSeconds(raw.holdSeconds);
  return {
    resourceId: context.resourceId,
    page: context.page,
    turnId,
    caption: shorten(raw.caption, 120) ?? actions.find((action) => action.caption)?.caption ?? "Lihat bagian ini",
    ...(holdSeconds !== undefined ? { holdSeconds } : {}),
    actions,
  };
}

export function contextForModel(context: PdfViewContext, turnId: string) {
  const { image: _image, resolveTextRange: _resolve, ...view } = context;
  return {
    ...view,
    turnId,
    coordinateSystem:
      "normalized original page, top-left (0,0), bottom-right (1,1)",
    imageAvailable: !!context.image,
  };
}

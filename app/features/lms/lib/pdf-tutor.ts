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
  text?: string;
  /** Written notes live beside the document so they cannot obscure its content. */
  placement?: "side";
  points?: PdfPoint[];
  rects?: PdfRect[];
};
export type PdfGuidance = {
  resourceId: string;
  page: number;
  revision: number;
  turnId: string;
  caption: string;
  holdSeconds?: number;
  actions: PdfAction[];
};

export type PdfCursorCue = Omit<PdfGuidance, "actions"> & PdfPoint;

/** Cursor-only steps use the same grounding and viewport checks as annotations. */
export function parsePdfCursor(raw: unknown, context: PdfViewContext, turnId: string): PdfCursorCue {
  if (!record(raw)) throw new Error("Target cursor tidak valid.");
  const guidance = parsePdfGuidance({ ...raw, actions: [{
    kind: "point", blockId: raw.blockId, x: raw.x, y: raw.y,
  }] }, context, turnId);
  const { actions, ...identity } = guidance;
  return { ...identity, x: actions[0].x, y: actions[0].y };
}

/** Durations are supplied by the model; omitted values support older Live sessions. */
export function parsePdfHoldSeconds(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1 || value > 20)
    throw new Error("holdSeconds harus berupa angka antara 1 dan 20 detik.");
  return value;
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

/** Validate the ENTIRE tool batch before mutating anything. Model output is untrusted. */
export function parsePdfGuidance(
  raw: unknown,
  context: PdfViewContext,
  turnId: string,
): PdfGuidance {
  if (
    !record(raw) ||
    raw.resourceId !== context.resourceId ||
    raw.page !== context.page ||
    raw.revision !== context.revision ||
    raw.turnId !== turnId
  ) {
    throw new Error(
      "Konteks atau giliran sudah berubah. Panggil get_pdf_context lagi.",
    );
  }
  if (
    typeof raw.caption !== "string" ||
    !raw.caption.trim() ||
    raw.caption.length > 120 ||
    !Array.isArray(raw.actions) ||
    raw.actions.length < 1 ||
    raw.actions.length > 8
  ) {
    throw new Error("Caption atau jumlah tindakan tidak valid.");
  }
  const holdSeconds = parsePdfHoldSeconds(raw.holdSeconds);
  const actions = raw.actions.map((value): PdfAction => {
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
    const actionHoldSeconds = parsePdfHoldSeconds(value.holdSeconds);
    if (value.caption !== undefined && (typeof value.caption !== "string" ||
        !value.caption.trim() || value.caption.length > 120))
      throw new Error("Caption tindakan harus berisi 1–120 karakter.");
    const block =
      value.blockId === undefined
        ? null
        : context.blocks.find((b) => b.id === value.blockId);
    if (value.blockId !== undefined && !block)
      throw new Error("Block tidak ditemukan pada halaman ini.");
    let rects: PdfRect[] | undefined;
    if (value.startOffset !== undefined || value.endOffset !== undefined || value.quote !== undefined) {
      if (!block || kind !== "highlight") throw new Error("Rentang teks memerlukan highlight dan blockId.");
      const start = value.quote !== undefined && typeof value.quote === "string"
        ? block.text.indexOf(value.quote) : value.startOffset;
      const end = typeof value.quote === "string" && typeof start === "number"
        ? start + value.quote.length : value.endOffset;
      if (typeof start !== "number" || typeof end !== "number" ||
          !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > block.text.length)
        throw new Error("Rentang teks tidak valid. Gunakan quote persis dari block atau offset 0-based.");
      rects = context.resolveTextRange?.(block.id, start, end);
      if (!rects?.length) throw new Error("Rentang teks belum tersedia. Gunakan blockId tanpa offset.");
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
      throw new Error("Koordinat harus berada dalam halaman (0..1).");
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
    if (
      kind === "text" &&
      (typeof value.text !== "string" ||
        !value.text.trim() ||
        value.text.length > 100)
    )
      throw new Error("Catatan harus berisi 1–100 karakter.");
    const anchor = points?.[0] ?? {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };
    if (kind !== "text" && (
      context.viewport.width <= 0 ||
      context.viewport.height <= 0 ||
      !intersects({ ...anchor, width: 0, height: 0 }, context.viewport) ||
      (points &&
        !points.every((p) =>
          intersects({ ...p, width: 0, height: 0 }, context.viewport),
        ))
    )) {
      throw new Error(
        "Target di luar area terlihat. Minta siswa menggulir terlebih dahulu.",
      );
    }
    return {
      kind,
      ...(value.caption !== undefined ? { caption: value.caption as string } : {}),
      ...(actionHoldSeconds !== undefined ? { holdSeconds: actionHoldSeconds } : {}),
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      ...(kind === "text" ? { text: value.text as string } : {}),
      ...(kind === "text" ? { placement: "side" as const } : {}),
      ...(points ? { points } : {}),
      ...(rects ? { rects } : {}),
    };
  });
  return {
    resourceId: context.resourceId,
    page: context.page,
    revision: context.revision,
    turnId,
    caption: raw.caption,
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

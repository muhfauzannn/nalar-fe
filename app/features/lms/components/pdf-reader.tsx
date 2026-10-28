import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask, TextLayer } from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { studentResourceFileUrl } from "~/lib/files";
import {
  clampUnit,
  rotateRect,
  type PdfBlock,
  type PdfCursorCue,
  type PdfGuidance,
  type PdfRect,
  type PdfSelection,
  type PdfViewContext,
} from "../lib/pdf-tutor";
import { loadPdfjs } from "../lib/pdfjs";
import { PdfTutorOverlay } from "./pdf-tutor-overlay";

type Evidence = {
  fingerprint: string;
  blocks: PdfBlock[];
  image: string;
  totalPages: number;
  resolveTextRange?: PdfViewContext["resolveTextRange"];
};
type Props = {
  resourceId: string;
  title: string;
  guidance: PdfGuidance | null;
  cursorCue?: PdfCursorCue | null;
  onContext: (context: PdfViewContext | null) => void;
};

export function PdfReader({ resourceId, title, guidance, cursorCue, onContext }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [effectiveRotation, setEffectiveRotation] = useState(0);
  const [size, setSize] = useState({ width: 600, height: 800 });
  const [hostWidth, setHostWidth] = useState(600);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selection, setSelection] = useState<PdfSelection | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const scrollHost = useRef<HTMLDivElement>(null);
  const pageHost = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const textHost = useRef<HTMLDivElement>(null);
  const revision = useRef(0);
  const lastContext = useRef("");
  const currentEvidence = useRef(evidence);
  currentEvidence.current = evidence;

  useEffect(() => {
    let disposed = false;
    let task:
      ReturnType<Awaited<ReturnType<typeof loadPdfjs>>["getDocument"]> | undefined;
    setLoading(true);
    setError(null);
    onContext(null);
    void (async () => {
      const pdfjs = await loadPdfjs();
      if (disposed) return;
      task = pdfjs.getDocument({
        url: studentResourceFileUrl(resourceId),
        withCredentials: true,
        cMapUrl: "/pdfjs/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "/pdfjs/standard_fonts/",
        wasmUrl: "/pdfjs/wasm/",
      });
      task.onPassword = () => {
        if (!disposed)
          setError(
            "PDF ini dilindungi kata sandi. Minta pengajar mengunggah versi yang dapat dibuka.",
          );
        void task?.destroy();
      };
      const document = await task.promise;
      if (disposed) {
        await task?.destroy();
        return;
      }
      setPdf(document);
    })().catch((caught) => {
      if (!disposed) {
        console.error("PDF open failed", caught);
        setLoading(false);
        setError(
          (previous) =>
            previous ??
            "PDF belum dapat dibuka. Periksa koneksi atau coba lagi.",
        );
      }
    });
    return () => {
      disposed = true;
      void task?.destroy();
    };
  }, [resourceId, retry, onContext]);

  useEffect(() => {
    const host = scrollHost.current;
    if (!host) return;
    const observer = new ResizeObserver(() =>
      setHostWidth(Math.max(240, host.clientWidth - 40)),
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf || !canvasHost.current || !textHost.current) return;
    let disposed = false;
    let render: RenderTask | undefined;
    let imageRender: RenderTask | undefined;
    let textLayer: TextLayer | undefined;
    setLoading(true);
    setError(null);
    setEvidence(null);
    lastContext.current = "";
    onContext(null);
    void (async () => {
      const pdfjs = await loadPdfjs();
      const source = await pdf.getPage(page);
      if (disposed) return;
      const original = source.getViewport({ scale: 1, rotation: 0 });
      const angle = (source.rotate + rotation) % 360;
      const natural = source.getViewport({ scale: 1, rotation: angle });
      const scale = Math.min(hostWidth / natural.width, 1.5) * zoom;
      const viewport = source.getViewport({ scale, rotation: angle });
      const canvas = document.createElement("canvas");
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(viewport.width * ratio);
      canvas.height = Math.ceil(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvas.setAttribute("aria-label", `${title}, halaman ${page}`);
      canvas.setAttribute("role", "img");
      canvasHost.current!.replaceChildren(canvas);
      textHost.current!.replaceChildren();
      setSize({ width: viewport.width, height: viewport.height });
      setEffectiveRotation(angle);
      render = source.render({
        canvas,
        viewport,
        transform: [ratio, 0, 0, ratio, 0, 0],
      });
      void render.promise.catch(() => {});
      const content = await source.getTextContent();
      if (disposed) return;
      const blocks: PdfBlock[] = [];
      let textBudget = 24_000;
      for (const [index, item] of content.items.entries()) {
        if (!("str" in item) || !item.str.trim()) continue;
        if (textBudget <= 0 || blocks.length >= 600) break;
        const blockText = item.str.slice(0, Math.min(1000, textBudget));
        textBudget -= blockText.length;
        const [a, b, c, d, e, f] = item.transform;
        const along = Math.hypot(a, b) || 1;
        const up = Math.hypot(c, d) || 1;
        const ascent = content.styles[item.fontName]?.ascent ?? 0.8;
        const height = item.height || up;
        const corners = [0, item.width].flatMap((w) =>
          [-height * (1 - ascent), height * ascent].map((h) =>
            original.convertToViewportPoint(
              e + (a / along) * w + (c / up) * h,
              f + (b / along) * w + (d / up) * h,
            ),
          ),
        );
        const xs = corners.map((p) => p[0] / original.width);
        const ys = corners.map((p) => p[1] / original.height);
        const x = clampUnit(Math.min(...xs));
        const y = clampUnit(Math.min(...ys));
        blocks.push({
          id: `p${page}-b${index}`,
          text: blockText,
          x,
          y,
          width: clampUnit(Math.max(...xs)) - x,
          height: clampUnit(Math.max(...ys)) - y,
        });
      }
      textHost.current!.style.setProperty(
        "--total-scale-factor",
        String(scale),
      );
      textLayer = new pdfjs.TextLayer({
        textContentSource: content,
        container: textHost.current!,
        viewport,
      });
      await Promise.all([render.promise, textLayer.render()]);
      if (disposed) return;
      // Always ground vision in a clean, unrotated page, independent of zoom/DPR.
      // 1280 px / q0.75 is ~1/3 smaller than 1568 px / q0.82 on a text-heavy A4 page (191 vs
      // 284 KB) and still legible; the text itself also reaches the model as blocks.
      const imageCanvas = document.createElement("canvas");
      const imageViewport = source.getViewport({
        scale: Math.min(1.75, 1280 / Math.max(original.width, original.height)),
        rotation: 0,
      });
      imageCanvas.width = Math.ceil(imageViewport.width);
      imageCanvas.height = Math.ceil(imageViewport.height);
      imageRender = source.render({
        canvas: imageCanvas,
        viewport: imageViewport,
      });
      await imageRender.promise;
      if (disposed) return;
      // PDF.js exposes one text div per text item, including empty items.
      const textItems = content.items.filter((item) => "str" in item);
      const resolveTextRange = (blockId: string, start: number, end: number) => {
        const item = content.items[Number(blockId.split("-b")[1])];
        const index = textItems.indexOf(item as typeof textItems[number]);
        const span = textLayer?.textDivs[index];
        const host = pageHost.current;
        if (!span?.firstChild || !host || !span.isConnected) return [];
        const range = document.createRange();
        range.setStart(span.firstChild, start);
        range.setEnd(span.firstChild, end);
        const pageRect = host.getBoundingClientRect();
        return [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).map((r) =>
          rotateRect({
            x: clampUnit((r.left - pageRect.left) / pageRect.width),
            y: clampUnit((r.top - pageRect.top) / pageRect.height),
            width: clampUnit(r.width / pageRect.width),
            height: clampUnit(r.height / pageRect.height),
          }, -angle),
        );
      };
      setEvidence({
        resolveTextRange,
        fingerprint: pdf.fingerprints[0] ?? resourceId,
        blocks: blocks.slice(0, 600),
        image: imageCanvas.toDataURL("image/jpeg", 0.75).split(",")[1],
        totalPages: pdf.numPages,
      });
      setLoading(false);
    })().catch((caught) => {
      if (disposed || caught?.name === "RenderingCancelledException") return;
      console.error("PDF page render failed", caught);
      setLoading(false);
      setError("Halaman ini belum dapat ditampilkan. Coba muat ulang PDF.");
    });
    return () => {
      disposed = true;
      render?.cancel();
      imageRender?.cancel();
      textLayer?.cancel();
    };
  }, [pdf, page, zoom, rotation, hostWidth, title, onContext]);

  const publishContext = useCallback(() => {
    if (!evidence || loading || !pageHost.current || !scrollHost.current)
      return;
    const rect = pageHost.current.getBoundingClientRect();
    const rawHost = scrollHost.current.getBoundingClientRect();
    const host = {
      left: Math.max(0, rawHost.left),
      top: Math.max(0, rawHost.top),
      right: Math.min(window.innerWidth, rawHost.right),
      bottom: Math.min(window.innerHeight, rawHost.bottom),
    };
    const visible: PdfRect = {
      x: clampUnit((Math.max(rect.left, host.left) - rect.left) / rect.width),
      y: clampUnit((Math.max(rect.top, host.top) - rect.top) / rect.height),
      width: clampUnit(
        (Math.min(rect.right, host.right) - Math.max(rect.left, host.left)) /
          rect.width,
      ),
      height: clampUnit(
        (Math.min(rect.bottom, host.bottom) - Math.max(rect.top, host.top)) /
          rect.height,
      ),
    };
    const viewport = rotateRect(visible, -effectiveRotation);
    // Round only for comparison; retain accurate coordinates in the actual context.
    const signature = JSON.stringify({
      page,
      selection,
      fingerprint: evidence.fingerprint,
      viewport: Object.values(viewport).map((v) => Math.round(v * 100)),
    });
    if (signature === lastContext.current) return;
    lastContext.current = signature;
    revision.current++;
    onContext({
      resourceId,
      ...evidence,
      page,
      revision: revision.current,
      viewport,
      selection,
    });
  }, [
    evidence,
    loading,
    page,
    selection,
    effectiveRotation,
    onContext,
    resourceId,
  ]);

  useEffect(() => {
    publishContext();
    window.addEventListener("scroll", publishContext, { passive: true });
    window.addEventListener("resize", publishContext, { passive: true });
    return () => {
      window.removeEventListener("scroll", publishContext);
      window.removeEventListener("resize", publishContext);
    };
  }, [publishContext]);
  // Invalidate immediately on scroll, rather than allowing stale actions during a debounce.
  const invalidate = useCallback(() => {
    lastContext.current = "";
    onContext(null);
  }, [onContext]);

  const readSelection = useCallback(() => {
    const host = pageHost.current;
    const selected = window.getSelection();
    if (!host || loading || !selected?.rangeCount || selected.isCollapsed ||
        !host.contains(selected.anchorNode) || !host.contains(selected.focusNode)) return false;
    const text = selected.toString().trim().slice(0, 1500);
    if (!text) return false;
    const pageRect = host.getBoundingClientRect();
    const range = selected.getRangeAt(0);
    const normalized = (r: DOMRect): PdfRect => rotateRect({
      x: clampUnit((r.left - pageRect.left) / pageRect.width),
      y: clampUnit((r.top - pageRect.top) / pageRect.height),
      width: clampUnit(r.width / pageRect.width),
      height: clampUnit(r.height / pageRect.height),
    }, -effectiveRotation);
    const next = {
      text,
      ...normalized(range.getBoundingClientRect()),
      rects: [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).map(normalized),
    };
    setSelection((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    return true;
  }, [effectiveRotation, loading]);

  useEffect(() => {
    let frame = 0;
    const changed = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { readSelection(); });
    };
    document.addEventListener("selectionchange", changed);
    return () => {
      document.removeEventListener("selectionchange", changed);
      cancelAnimationFrame(frame);
    };
  }, [readSelection]);

  const selectAt = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      const host = pageHost.current;
      if (!host || !currentEvidence.current || loading) return;
      if (readSelection()) return;
      const rect = host.getBoundingClientRect();
      const client =
        "changedTouches" in event ? event.changedTouches[0] : event;
      if (!client) return;
      const point = rotateRect(
        {
          x: clampUnit((client.clientX - rect.left) / rect.width),
          y: clampUnit((client.clientY - rect.top) / rect.height),
          width: 0,
          height: 0,
        },
        -effectiveRotation,
      );
      const block = currentEvidence.current.blocks.find(
        (b) =>
          point.x >= b.x - 0.005 &&
          point.x <= b.x + b.width + 0.005 &&
          point.y >= b.y - 0.005 &&
          point.y <= b.y + b.height + 0.005,
      );
      setSelection(
        block
          ? { ...block, text: block.text }
          : {
              ...point,
              width: Math.min(0.035, 1 - point.x),
              height: Math.min(0.035, 1 - point.y),
              text: "Area yang ditunjuk siswa pada gambar halaman.",
            },
      );
    },
    [effectiveRotation, loading, readSelection],
  );

  const changePage = (next: number) => {
    invalidate();
    setEvidence(null);
    setSelection(null);
    setPage(next);
    scrollHost.current?.scrollTo({ top: 0, left: 0 });
  };

  return (
    <div className="flex min-w-0 flex-col">
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2"
        role="toolbar"
        aria-label="Navigasi PDF"
      >
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Halaman sebelumnya"
            disabled={!pdf || page <= 1 || loading}
            onClick={() => changePage(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <span
            className="min-w-24 text-center text-xs tabular-nums"
            data-testid="pdf-page-number"
          >
            {page} / {pdf?.numPages ?? "…"}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Halaman berikutnya"
            disabled={!pdf || page >= pdf.numPages || loading}
            onClick={() => changePage(page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Perkecil PDF"
            disabled={zoom <= 0.75 || loading}
            onClick={() => {
              invalidate();
              setZoom((v) => Math.max(0.75, v - 0.25));
            }}
          >
            <ZoomOut />
          </Button>
          <span className="min-w-10 text-center text-xs tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Perbesar PDF"
            disabled={zoom >= 2 || loading}
            onClick={() => {
              invalidate();
              setZoom((v) => Math.min(2, v + 0.25));
            }}
          >
            <ZoomIn />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Putar PDF"
            disabled={loading}
            onClick={() => {
              invalidate();
              setRotation((v) => (v + 90) % 360);
            }}
          >
            <RotateCw />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Unduh PDF"
            nativeButton={false}
            render={<a href={studentResourceFileUrl(resourceId, true)} />}
          >
            <Download />
          </Button>
        </div>
      </div>
      <div
        ref={scrollHost}
        onScroll={publishContext}
        className="relative h-[65svh] min-h-80 overflow-auto bg-muted/50 overscroll-contain"
        data-testid="pdf-scroll-host"
      >
        {error ? (
          <div className="p-5">
            <Alert variant="destructive">
              <AlertTitle>PDF tidak dapat ditampilkan</AlertTitle>
              <AlertDescription>
                <p>{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPdf(null);
                    setRetry((v) => v + 1);
                  }}
                >
                  Coba lagi
                </Button>
                <a
                  className="underline"
                  href={studentResourceFileUrl(resourceId)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka file asli
                </a>
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
        {loading && !error ? (
          <div
            role="status"
            className="absolute inset-x-0 top-8 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Spinner /> Menyiapkan halaman…
          </div>
        ) : null}
        <div className="flex min-w-full w-max justify-center p-5">
          <div
            ref={pageHost}
            data-testid="pdf-page"
            className="relative shrink-0 bg-white shadow-sm"
            style={{
              width: size.width,
              height: size.height,
              visibility: loading || error ? "hidden" : "visible",
            }}
            onMouseUp={selectAt}
            onTouchEnd={selectAt}
          >
            <div ref={canvasHost} />
            <div ref={textHost} className="textLayer pdf-study-text-layer" />
            <PdfTutorOverlay
              guidance={guidance?.page === page ? guidance : null}
              cursorCue={!loading && cursorCue?.page === page && cursorCue.revision === revision.current ? cursorCue : null}
              selection={selection}
              rotation={effectiveRotation}
              size={size}
              showCursor={!loading && guidance?.revision === revision.current}
            />
          </div>
        </div>
      </div>
      {selection ? (
        <div className="flex min-h-12 items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
          <p className="min-w-0 truncate">Dipilih: {selection.text}</p>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
          >
            Lepas pilihan
          </Button>
        </div>
      ) : null}
    </div>
  );
}

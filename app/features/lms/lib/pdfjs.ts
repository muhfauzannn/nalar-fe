/**
 * The one way to load pdf.js in the browser.
 *
 * pdf.js 6's modern build calls brand-new JS APIs (Uint8Array#toHex,
 * Map#getOrInsertComputed) that Safari 18 and Chrome < 140 do not have: the
 * document opened, then every page failed to render. The legacy build ships
 * polyfills for those, but still reads text with `for await` over a
 * ReadableStream, which Safari cannot iterate yet, so that one is patched here.
 * Library and worker must come from the same build.
 */
export async function loadPdfjs() {
  polyfillReadableStreamIteration();
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

function polyfillReadableStreamIteration() {
  if (typeof ReadableStream === "undefined") return;
  const proto = ReadableStream.prototype as ReadableStream & {
    [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
  };
  if (proto[Symbol.asyncIterator]) return;
  proto[Symbol.asyncIterator] = async function* (this: ReadableStream) {
    const reader = this.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  };
}

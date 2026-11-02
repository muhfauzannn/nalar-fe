export function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Loading cancelled", "AbortError"));
    };
    if (signal.aborted) return abort();
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        if (!signal.aborted) resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

export function waitForImage(image: HTMLImageElement, signal: AbortSignal) {
  const loaded = new Promise<void>((resolve, reject) => {
    const clean = () => {
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onLoad = () => {
      clean();
      resolve();
    };
    const onError = () => {
      clean();
      reject(new Error(`Image failed: ${image.currentSrc || image.src}`));
    };
    const onAbort = () => {
      clean();
      reject(new DOMException("Loading cancelled", "AbortError"));
    };
    if (signal.aborted) return onAbort();
    if (image.complete) return image.naturalWidth > 0 ? onLoad() : onError();
    image.addEventListener("load", onLoad, { once: true });
    image.addEventListener("error", onError, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
  });
  return abortable(
    loaded.then(() => image.decode?.()),
    signal,
  );
}

/** A child clientLoader may still be showing its hydration fallback. */
export function waitForRouteContent(root: HTMLElement, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const observer = new MutationObserver(check);
    function clean() {
      observer.disconnect();
      signal.removeEventListener("abort", onAbort);
    }
    function onAbort() {
      clean();
      reject(new DOMException("Loading cancelled", "AbortError"));
    }
    function check() {
      if (!root.querySelector("[data-application-loader]")) {
        clean();
        resolve();
      }
    }
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    observer.observe(root, { childList: true, subtree: true });
    check();
  });
}

/** Wait for the actual page's eager images and fonts, using the browser's own cache. */
export async function preparePageAssets(
  root: HTMLElement,
  signal: AbortSignal,
  progress: (completed: number, total: number) => void,
) {
  await waitForRouteContent(root, signal);
  const images = [...root.querySelectorAll<HTMLImageElement>("img")].filter(
    (image) =>
      image.loading !== "lazy" &&
      Boolean(image.getAttribute("src") || image.getAttribute("srcset")) &&
      !image.closest("[data-application-loader]"),
  );
  const jobs: Promise<unknown>[] = images.map((image) =>
    waitForImage(image, signal),
  );
  const fonts = root.ownerDocument.fonts;
  if (fonts) {
    for (const weight of [400, 500, 600, 700])
      jobs.push(abortable(fonts.load(`${weight} 16px Poppins`), signal));
  }
  let completed = 0;
  progress(completed, jobs.length);
  await Promise.all([
    ...jobs.map((job) =>
      job.then(() => {
        if (!signal.aborted) progress(++completed, jobs.length);
      }),
    ),
    ...(fonts ? [abortable(fonts.ready, signal)] : []),
  ]);
}

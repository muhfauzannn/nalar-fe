import { env } from "~/config/env";

/**
 * Thin, typed `fetch` wrapper — the single entry point for talking to the
 * backend API. Feature `api/` modules build on top of this; components must not
 * call `fetch` directly.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    /** Seconds the server asks us to wait (429), from the JSON body or the Retry-After header. */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Browser-only memory of GETs, stale-while-revalidate:
 *
 * - fresh (under 30 s): used as is, no request;
 * - stale (under 10 min): shown at once, refreshed in the background; when the
 *   refresh differs, `onStaleRefreshed` listeners run (the shell revalidates
 *   the open page, which then reads the fresh copy);
 * - older, or never read: fetched, and the page waits for it.
 *
 * Any write clears all of it (`request`), so a page never shows data from
 * before the user's own change; signing out clears it too.
 */
type Entry = { at: number; promise: Promise<unknown>; value?: unknown; settled: boolean; refreshing?: boolean };
const recentReads = new Map<string, Entry>();
const FRESH_MS = 30_000;
const STALE_MS = 10 * 60_000;
const refreshedListeners = new Set<(path: string) => void>();

export function clearRecentReads() {
  recentReads.clear();
}

/** Runs when a stale page's background refresh brought different data. */
export function onStaleRefreshed(listener: (path: string) => void) {
  refreshedListeners.add(listener);
  return () => {
    refreshedListeners.delete(listener);
  };
}

function remember(path: string, promise: Promise<unknown>) {
  const entry: Entry = { at: Date.now(), promise, settled: false };
  recentReads.set(path, entry);
  promise.then(
    (value) => {
      entry.value = value;
      entry.settled = true;
    },
    () => {
      if (recentReads.get(path) === entry) recentReads.delete(path);
    },
  );
  return entry;
}

function getRecent<T>(path: string, init?: RequestInit): Promise<T> {
  if (typeof document === "undefined") return request<T>(path, { ...init, method: "GET" });
  const hit = recentReads.get(path);
  const age = hit ? Date.now() - hit.at : Infinity;
  if (hit && age < FRESH_MS) return hit.promise as Promise<T>;
  if (hit?.settled && age < STALE_MS) {
    if (!hit.refreshing) {
      hit.refreshing = true;
      const before = JSON.stringify(hit.value);
      const promise = request<T>(path, { ...init, method: "GET" });
      promise.then(
        (value) => {
          // A write may have cleared the memory meanwhile: then this copy is not trusted.
          if (recentReads.get(path) !== hit) return;
          remember(path, Promise.resolve(value)).value = value;
          if (JSON.stringify(value) !== before) refreshedListeners.forEach((listener) => listener(path));
        },
        () => {
          hit.refreshing = false;
        },
      );
    }
    return Promise.resolve(hit.value as T);
  }
  return remember(path, request<T>(path, { ...init, method: "GET" })).promise as Promise<T>;
}

/**
 * For data that changes while the user works (an assignment's stages, a quiz
 * attempt): never served stale, but a prefetch made moments ago on the user's
 * intent (hover, touch) is used instead of asking again.
 */
const prefetched = new Map<string, { at: number; promise: Promise<unknown> }>();
const PREFETCH_MS = 10_000;

function prefetch(path: string, init?: RequestInit) {
  if (typeof document === "undefined") return;
  const hit = prefetched.get(path);
  if (hit && Date.now() - hit.at < PREFETCH_MS) return;
  const promise = request(path, { ...init, method: "GET" });
  prefetched.set(path, { at: Date.now(), promise });
  promise.catch(() => prefetched.delete(path));
}

function getPrefetched<T>(path: string, init?: RequestInit): Promise<T> {
  const hit = prefetched.get(path);
  prefetched.delete(path);
  if (hit && Date.now() - hit.at < PREFETCH_MS) return hit.promise as Promise<T>;
  return request<T>(path, { ...init, method: "GET" });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!init?.method || init.method === "GET") return send<T>(path, init);
  // Cleared again afterwards: a read that started during the write may hold the old data.
  clearRecentReads();
  prefetched.clear();
  try {
    return await send<T>(path, init);
  } finally {
    clearRecentReads();
    prefetched.clear();
  }
}

async function send<T>(path: string, init?: RequestInit): Promise<T> {
  // A multipart body must not get a Content-Type from us: the browser adds it, with the boundary.
  const isForm = init?.body instanceof FormData;
  const res = await fetch(`${env.apiUrl}${path}`, {
    credentials: "include",
    ...init,
    headers: { ...(isForm ? {} : { "Content-Type": "application/json" }), ...init?.headers },
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as {
      error?: unknown;
      code?: unknown;
      retryAfterSeconds?: unknown;
    } | null;
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Request failed: ${res.status} ${path}`;
    const header = Number(res.headers.get("retry-after"));
    const retryAfter =
      typeof payload?.retryAfterSeconds === "number"
        ? payload.retryAfterSeconds
        : Number.isFinite(header) && header > 0
          ? header
          : undefined;
    throw new HttpError(
      res.status,
      message,
      typeof payload?.code === "string" ? payload.code : undefined,
      retryAfter,
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "GET" }),
  /** GET that reuses a response from the last 30 s (see `recentReads`). */
  getRecent,
  getPrefetched,
  prefetch,
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: "PATCH", body: JSON.stringify(body) }),
  postForm: <T>(path: string, form: FormData, init?: RequestInit) =>
    request<T>(path, { ...init, method: "POST", body: form }),
  putForm: <T>(path: string, form: FormData, init?: RequestInit) =>
    request<T>(path, { ...init, method: "PUT", body: form }),
  delete: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "DELETE" }),
};

export function forwardedRequestInit(request: Request): RequestInit {
  const cookie = request.headers.get("cookie");
  return cookie ? { headers: { cookie } } : {};
}

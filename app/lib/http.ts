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
 * Browser-only memory of recent GETs, so a page prefetched on hover (or opened
 * again with Back) renders without waiting on the network. Any write clears all
 * of it, so a page never shows data from before the user's own change.
 */
const recentReads = new Map<string, { at: number; promise: Promise<unknown> }>();
const RECENT_READ_MS = 30_000;

export function clearRecentReads() {
  recentReads.clear();
}

function getRecent<T>(path: string, init?: RequestInit): Promise<T> {
  if (typeof document === "undefined") return request<T>(path, { ...init, method: "GET" });
  const hit = recentReads.get(path);
  if (hit && Date.now() - hit.at < RECENT_READ_MS) return hit.promise as Promise<T>;
  const promise = request<T>(path, { ...init, method: "GET" });
  recentReads.set(path, { at: Date.now(), promise });
  promise.catch(() => {
    if (recentReads.get(path)?.promise === promise) recentReads.delete(path);
  });
  return promise;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!init?.method || init.method === "GET") return send<T>(path, init);
  // Cleared again afterwards: a read that started during the write may hold the old data.
  clearRecentReads();
  try {
    return await send<T>(path, init);
  } finally {
    clearRecentReads();
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

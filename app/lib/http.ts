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
  ) {
    super(message);
    this.name = "HttpError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
    } | null;
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Request failed: ${res.status} ${path}`;
    throw new HttpError(
      res.status,
      message,
      typeof payload?.code === "string" ? payload.code : undefined,
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "GET" }),
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

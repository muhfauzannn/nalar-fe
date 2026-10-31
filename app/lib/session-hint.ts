/**
 * A cookie that says "this browser was signed in recently", set by the app
 * itself on its own origin.
 *
 * The real session cookie belongs to the API origin, so the SSR server cannot
 * tell who is asking. Without a hint it sends the full landing page to a
 * signed-in student and only redirects after the browser has asked the API, so
 * the landing page shows for a moment before the dashboard. With the hint the
 * server can redirect before it sends any HTML.
 *
 * It is not a credential and grants nothing: it only decides which page is
 * rendered first, and the API still authorizes every request. A stale hint
 * costs one redirect: the app shell gets a 401 and clears it.
 */
const COOKIE = "nalar_signed_in";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** Server or browser: reads the hint from a request's Cookie header. */
export function hasSignedInHint(request: Request) {
  return new RegExp(`(?:^|;\\s*)${COOKIE}=1(?:;|$)`).test(
    request.headers.get("cookie") ?? "",
  );
}

function write(value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function rememberSignedIn() {
  write("1", MAX_AGE_SECONDS);
}

export function forgetSignedIn() {
  write("", 0);
}

/**
 * App-wide navigation data. Keep labels/hrefs here (not hard-coded in the
 * Navbar/Footer components) — same rule as `siteConfig`.
 */

export type NavItem = {
  label: string;
  href: string;
};

/** Public top-nav links shown before a student signs in. */
export const mainNav: readonly NavItem[] = [
  { label: "Beranda", href: "/" },
] as const;

/** Primary student navigation shared by the public navbar and LMS shell. */
export const studentNav: readonly NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Course saya", href: "/courses" },
  { label: "Kelola course", href: "/manage" },
] as const;

/** Where a student lands right after signing in or registering. */
export const postAuthPath = "/dashboard";

const PLACEHOLDER_ORIGIN = "http://app.invalid";

/**
 * The `next` of a sign-in link (`/login?next=/quizzes/abc`), if it is safe to
 * send the student to: a path inside this app and nothing else. Anything that
 * a browser could read as another site ("//host", "/\\host", a scheme, control
 * characters) or that would loop back into the auth screens gives `null`.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || value.length > 2048 || !value.startsWith("/")) return null;
  if (value.startsWith("//") || /[\u0000-\u001f\u007f\\]/.test(value)) return null;
  const url = new URL(value, PLACEHOLDER_ORIGIN);
  if (url.origin !== PLACEHOLDER_ORIGIN) return null;
  if (/^\/(login|register)(\/|$)/.test(url.pathname)) return null;
  // Dot segments collapse during parsing ("/..//host" becomes "//host"), so check the result too.
  const path = url.pathname + url.search;
  return path.startsWith("//") ? null : path;
}

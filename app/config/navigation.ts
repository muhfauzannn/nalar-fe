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

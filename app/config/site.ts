/**
 * Static, app-wide metadata. Import from `~/config` — never hard-code these
 * strings in components or route `meta`.
 */
export const siteConfig = {
  name: "Bernalar",
  description: "Bernalar frontend application.",
  // Public base URL; override per environment via `env.appUrl`.
  url: "https://bernalar.app",
} as const;

export type SiteConfig = typeof siteConfig;

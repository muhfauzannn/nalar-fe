import { Link } from "react-router";

import { siteConfig } from "~/config";
import { cn } from "~/lib/utils";

/**
 * The Bernalar logo lockup. Renders the provided SVG mark (`/illustration/
 * logo.svg`). Shared by the Navbar, Footer, sidebar and auth screens so the logo
 * is defined once; size it via `className` (defaults to a navbar-friendly height).
 *
 * The navy mark disappears on dark surfaces, so by default both versions are
 * rendered and CSS shows the right one for the active theme (no flash, no JS).
 * `isDark` forces the light-on-dark mark for surfaces that are always dark
 * (the footer).
 */
export function Brand({
  className,
  isDark = false,
}: {
  className?: string;
  isDark?: boolean;
}) {
  const size = cn("h-8 w-auto select-none", className);
  return (
    <Link
      to="/"
      aria-label={`${siteConfig.name} — beranda`}
      className="inline-flex items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {isDark ? (
        <img src="/illustration/logo-dark.svg" alt={siteConfig.name} className={size} draggable={false} />
      ) : (
        <>
          <img src="/illustration/logo.svg" alt={siteConfig.name} className={cn(size, "dark:hidden")} draggable={false} />
          <img src="/illustration/logo-dark.svg" alt="" aria-hidden="true" className={cn(size, "hidden dark:block")} draggable={false} />
        </>
      )}
    </Link>
  );
}

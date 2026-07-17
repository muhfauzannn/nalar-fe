import { Link } from "react-router";

import { siteConfig } from "~/config";
import { cn } from "~/lib/utils";

/**
 * The Bernalar logo lockup. Renders the provided SVG mark (`/illustration/
 * logo.svg`). Shared by the Navbar and Footer so the logo is defined once;
 * size it via `className` (defaults to a navbar-friendly height).
 */
export function Brand({
  className,
  isDark = false,
}: {
  className?: string;
  isDark?: boolean;
}) {
  return (
    <Link
      to="/"
      aria-label={`${siteConfig.name} — home`}
      className="inline-flex items-center"
    >
      <img
        src={isDark ? "/illustration/logo-dark.svg" : "/illustration/logo.svg"}
        alt={siteConfig.name}
        className={cn("h-8 w-auto select-none", className)}
        draggable={false}
      />
    </Link>
  );
}

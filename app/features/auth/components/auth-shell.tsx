import { useRef, type ReactNode } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Brand } from "~/components/layout/brand";

/**
 * Persistent split-screen chrome for the `auth` feature. Mounted by the
 * **`_auth` pathless layout route** (`routes/_auth.tsx`), so the left brand
 * panel + illustration stay mounted while `<Outlet/>` swaps the form between
 * `/login` and `/register` — the switch feels smooth (no reload/flash of the
 * illustration). Sits OUTSIDE `_site`, so there is no Navbar/Footer.
 *
 * The per-page heading/form/footer (which DO change on navigation) live in
 * `AuthFormPanel`, which owns its own enter animation.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Gentle, endless float on the (persistent) illustration.
        gsap.to("[data-auth-art]", {
          y: -10,
          duration: 3,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — desktop only, persists across auth routes */}
      <aside className="relative hidden overflow-hidden bg-brand-lavender-soft lg:flex lg:flex-col lg:justify-between lg:p-10">
        <Brand />

        <div className="flex flex-1 items-center justify-center py-8">
          <img
            data-auth-art
            src="/illustration/auth.svg"
            alt=""
            aria-hidden
            draggable={false}
            className="w-full max-w-md select-none"
          />
        </div>

        <p className="max-w-sm text-lg font-medium text-foreground/80 text-balance">
          Latih penalaranmu, satu soal setiap hari.
        </p>
      </aside>

      {/* Form panel — its inner content (the Outlet) changes per route */}
      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Mobile brand (the panel above is hidden on small screens) */}
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

/** Inline link used in the auth footer switch line. */
export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="font-medium text-foreground underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}

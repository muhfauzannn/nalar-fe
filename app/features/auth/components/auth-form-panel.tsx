import { useRef, type ReactNode } from "react";
import { useLocation } from "react-router";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * The changing half of the auth screen: heading (+ optional subtitle) + form + footer.
 * Rendered inside the persistent `AuthShell` chrome via the `_auth` layout's
 * `<Outlet/>`, so it remounts on every `/login` ↔ `/register` navigation. A
 * short, reduced-motion-aware stagger runs on each mount, keyed on the path,
 * so switching flows reads as a smooth transition rather than a hard swap.
 */
export function AuthFormPanel({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-auth-reveal]", {
          y: 10,
          opacity: 0,
          duration: 0.35,
          ease: "power2.out",
          stagger: 0.05,
          clearProps: "transform,opacity",
        });
      });
    },
    { scope, dependencies: [pathname] },
  );

  return (
    <div ref={scope}>
      <div data-auth-reveal className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-balance">
          {title}
        </h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>

      <div data-auth-reveal className="mt-8">
        {children}
      </div>

      <p data-auth-reveal className="mt-8 text-center text-sm text-muted-foreground">
        {footer}
      </p>
    </div>
  );
}

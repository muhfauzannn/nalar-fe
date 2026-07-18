import { useRef } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";

/**
 * Full-screen 404 page for the `not-found` feature. Rendered by the splat
 * route (`routes/$.tsx`), which sits OUTSIDE the `_site` pathless layout — so
 * this page has no Navbar or Footer by design and owns its own full-height
 * layout. Split layout: the `sleeping.svg` illustration on the left, the copy
 * + action on the right (stacked on mobile). The offset mint highlight
 * (DESIGN.md motif) carries the "404" eyebrow; motion stays subtle and
 * reduced-motion-aware.
 */
export function NotFoundPage() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-nf-item]", {
          y: 12,
          opacity: 0,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.07,
          clearProps: "transform,opacity",
        });

        // Gentle, endless float on the illustration.
        gsap.to("[data-nf-art]", {
          y: -8,
          duration: 2.4,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });
    },
    { scope },
  );

  return (
    <main
      ref={scope}
      className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground"
    >
      <div className="flex max-w-3xl flex-col items-center gap-8 text-center sm:flex-row sm:gap-12 sm:text-left">
        {/* Left — illustration */}
        <img
          data-nf-art
          src="/illustration/sleeping.svg"
          alt=""
          aria-hidden
          draggable={false}
          className="size-36 shrink-0 select-none sm:size-44"
        />

        {/* Right — copy + action */}
        <div className="flex flex-col items-center gap-4 sm:items-start">
          <span
            data-nf-item
            className="relative inline-block text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 -z-10 h-1/2 -rotate-1 rounded-sm bg-brand-mint-soft"
            />
            Error 404
          </span>

          <h1
            data-nf-item
            className="text-2xl font-bold tracking-tight text-balance sm:text-3xl"
          >
            Halaman tidak ditemukan
          </h1>

          <Button data-nf-item size="lg" className="mt-2" render={<Link to="/" />}>
            <ArrowLeft data-icon="inline-start" />
            Kembali ke beranda
          </Button>
        </div>
      </div>
    </main>
  );
}

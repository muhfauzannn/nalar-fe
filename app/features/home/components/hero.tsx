import { useRef } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Button } from "~/components/ui/button";
import type { HomeContent } from "../api/get-home-content";

/**
 * Feature-specific presentational component. Receives data via props; it does
 * not load data itself (that is the route loader + `api/` layer's job).
 *
 * Layout follows DESIGN.md: left-aligned headline/subtext/CTA with the large
 * custom illustration on the right. The key phrase sits over the brand's offset
 * mint highlight block (the recurring motif). Motion is restrained — a short
 * intro stagger + a gentle float on the art, both gated by reduced-motion.
 */
export function Hero({ content }: { content: HomeContent }) {
  const { hero } = content;
  const scope = useRef<HTMLDivElement>(null);

  return (
    <section
      ref={scope}
      className="flex flex-col-reverse md:grid items-center gap-10 py-16 md:min-h-[calc(100vh-4rem)] md:grid-cols-2 md:gap-8 md:py-20"
    >
      {/* Text column — left-aligned */}
      <div className="flex max-md:text-center flex-col items-start gap-6 text-left">
        <h1
          data-hero-item
          className="font-heading text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl"
        >
          {hero.title}{" "}
          <span className="relative inline-block">
            <span className="absolute inset-x-0 bottom-1 -z-10 h-1/3 -rotate-1 rounded-md bg-brand-mint-soft" />
            {hero.highlight}
          </span>{" "}
          {hero.titleTail}
        </h1>

        <p
          data-hero-item
          className="max-w-xl text-lg text-muted-foreground text-pretty"
        >
          {hero.description}
        </p>

        <div data-hero-item className="max-md:self-center max-md:w-full">
          <Button size="lg" render={<Link to={hero.cta.href} />}>
            {hero.cta.label}
          </Button>
        </div>
      </div>

      {/* Illustration column */}
      <div className="flex justify-center md:justify-end">
        <img
          data-hero-art
          src="/illustration/hero.svg"
          alt=""
          aria-hidden
          draggable={false}
          className="w-full max-md:max-w-70 max-w-lg select-none"
        />
      </div>
    </section>
  );
}

import { Button } from "~/components/ui/button";
import type { HomeContent } from "../api/get-home-content";

/**
 * Feature-specific presentational component. Receives data via props; it does
 * not load data itself (that is the route loader + `api/` layer's job).
 */
export function Hero({ content }: { content: HomeContent }) {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        {content.title}
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground text-balance">
        {content.description}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg">Get started</Button>
        <Button size="lg" variant="outline">
          Documentation
        </Button>
      </div>
    </section>
  );
}

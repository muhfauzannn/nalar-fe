import { Container } from "~/components/layout/container";
import { Hero } from "../components/hero";
import type { HomeContent } from "../api/get-home-content";

/**
 * Page-level component for the `home` feature: composes the feature's
 * components into a full page. Receives data via props from the route loader —
 * it does not fetch. Route modules render this and stay thin.
 *
 * Global chrome (Navbar/Footer) is provided by `root.tsx`, so pages render
 * only their own content.
 */
export function HomePage({ content }: { content: HomeContent }) {
  return (
    <Container>
      <Hero content={content} />
    </Container>
  );
}

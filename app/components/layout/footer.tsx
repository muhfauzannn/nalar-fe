import { Brand } from "./brand";
import { Container } from "./container";
import { siteConfig } from "~/config";

/**
 * Site footer: the brand and the copyright line. Links are added only for pages that exist;
 * the template's About / Product / Help columns pointed at routes this app does not have.
 * Kept motion-free on purpose.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-primary text-primary-foreground">
      <div aria-hidden className="h-px w-full bg-brand-mint/40" />
      <Container className="flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
        <Brand className="h-9" isDark={true} />
        <p className="text-sm text-primary-foreground/70">
          © {year} {siteConfig.name}
        </p>
      </Container>
    </footer>
  );
}

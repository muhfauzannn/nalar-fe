import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";

import { Brand } from "./brand";
import { Container } from "./container";
import { footerNav, siteConfig, socialLinks } from "~/config";

/**
 * Site footer. DESIGN.md asks for a dark-navy, four-column layout (brand +
 * About / Product / Help). The non-generic signature here is the oversized
 * clipped wordmark band along the bottom edge — an editorial touch that reads
 * as brand, not decoration. Kept motion-free on purpose.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-primary text-primary-foreground">
      {/* top mint hairline accent */}
      <div aria-hidden className="h-px w-full bg-brand-mint/40" />

      <Container className="pt-16 pb-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          {/* Brand block */}
          <div className="flex flex-col gap-4">
            <Brand className="h-9" isDark={true} />
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {socialLinks.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-0.5 py-0.5 text-sm text-primary-foreground/75 transition-colors hover:text-brand-mint"
                  >
                    {s.label}
                    <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          {footerNav.map((col) => (
            <nav
              key={col.title}
              aria-label={col.title}
              className="flex flex-col gap-3.5"
            >
              <h3 className="text-xs font-semibold tracking-wider text-primary-foreground/70 uppercase">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {col.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className="group relative inline-block py-0.5 text-sm text-primary-foreground/75 transition-colors hover:text-primary-foreground"
                    >
                      {item.label}
                      <span
                        aria-hidden
                        className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-brand-mint transition-transform duration-300 ease-out group-hover:scale-x-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col-reverse items-start justify-between gap-4 border-t border-primary-foreground/10 pt-6 text-sm text-primary-foreground/70 sm:flex-row sm:items-center">
          <p>
            © {year} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link
              to="/privacy"
              className="transition-colors hover:text-primary-foreground"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="transition-colors hover:text-primary-foreground"
            >
              Terms
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}

import { useRef, useState } from "react";
import { NavLink } from "react-router";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Languages, Menu } from "lucide-react";

import { Brand } from "./brand";
import { Container } from "./container";
import { SessionActions } from "./session-actions";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { mainNav, studentNav, type NavItem } from "~/config";
import { useSession } from "~/lib/auth-client";
import { cn } from "~/lib/utils";

/**
 * Top navigation. Follows DESIGN.md (logo left, centered links, language
 * toggle + Login right) but with two signature, non-generic touches:
 *  - the active link sits on an offset mint highlight block (the DESIGN.md
 *    section-header motif), instead of the usual underline;
 *  - the bar is transparent over the hero and only condenses into a blurred
 *    surface once you scroll — motion stays subtle.
 */
export function Navbar() {
  const scope = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang] = useState<"ID" | "EN">("ID");
  const { data: session } = useSession();
  const navigation = session ? studentNav : mainNav;

  useGSAP(
    () => {
      const onScroll = () => setScrolled(window.scrollY > 8);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });

      // Subtle, reduced-motion-aware intro. Never runs for users who opt out.
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-nav-item]", {
          y: -8,
          opacity: 0,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.05,
          clearProps: "transform,opacity",
        });
      });

      return () => window.removeEventListener("scroll", onScroll);
    },
    { scope },
  );

  return (
    <header
      ref={scope}
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-border bg-background/70 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <div data-nav-item>
          <Brand />
        </div>

        {/* Centered links — desktop only */}
        <nav
          aria-label="Primary"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
        >
          {navigation.map((item) => (
            <NavItemLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>

        {/* Right cluster — desktop */}
        <div data-nav-item className="hidden items-center gap-1.5 md:flex">
          <LangToggle
            lang={lang}
            onToggle={() => setLang(lang === "ID" ? "EN" : "ID")}
          />
          <SessionActions />
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <MobileMenu
            navigation={navigation}
            lang={lang}
            onToggleLang={() => setLang(lang === "ID" ? "EN" : "ID")}
          />
        </div>
      </Container>
    </header>
  );
}

function NavItemLink({ href, label }: { href: string; label: string }) {
  return (
    <NavLink
      to={href}
      end={href === "/"}
      data-nav-item
      className="group relative px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground"
    >
      {({ isActive }) => (
        <>
          {/* offset highlight block for the active link */}
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-1.5 bottom-1 -z-10 h-1/3 -rotate-1 rounded-md bg-brand-mint-soft transition-opacity duration-300",
              isActive ? "opacity-100" : "opacity-0",
            )}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

function LangToggle({
  lang,
  onToggle,
}: {
  lang: "ID" | "EN";
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      aria-label={`Language: ${lang}. Switch language.`}
    >
      <Languages data-icon="inline-start" />
      {lang}
    </Button>
  );
}

function MobileMenu({
  navigation,
  lang,
  onToggleLang,
}: {
  navigation: readonly NavItem[];
  lang: "ID" | "EN";
  onToggleLang: () => void;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu />
          </Button>
        }
      />
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Brand />
        </SheetHeader>
        <nav aria-label="Primary" className="mt-2 flex flex-col px-4">
          {navigation.map((item) => (
            <SheetClose
              key={item.href}
              render={
                <NavLink
                  to={item.href}
                  end={item.href === "/"}
                  className="border-b border-border/60 py-3 text-base font-medium text-foreground/80 transition-colors hover:text-foreground aria-[current=page]:text-foreground"
                >
                  {item.label}
                </NavLink>
              }
            />
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 p-4">
          <Button variant="outline" size="sm" onClick={onToggleLang}>
            <Languages data-icon="inline-start" />
            {lang}
          </Button>
          <SessionActions grow />
        </div>
      </SheetContent>
    </Sheet>
  );
}

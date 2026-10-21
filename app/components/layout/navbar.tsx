import { useEffect, useRef, useState, type CSSProperties } from "react";
import { NavLink } from "react-router";
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
 * Top navigation: logo left, links centred, language + account right.
 *
 * It is chrome people see on every page, so it barely moves:
 *  - no intro animation (it used to flash: server HTML visible, then hidden by JS,
 *    then animated in);
 *  - the bar is transparent over the hero and a blurred surface fades in once the
 *    page scrolls. The surface is ONE layer whose opacity animates, so the blur
 *    and the background arrive together (animating `background-color` alone left
 *    the blur snapping on);
 *  - links give press feedback and a keyboard ring; nothing else.
 * The three-column grid means the centre links can never run into the right
 * cluster, however wide it gets (centring with `absolute` did, at 768px).
 */
export function Navbar() {
  const [lang, setLang] = useState<"ID" | "EN">("ID");
  const { data: session } = useSession();
  const navigation = session ? studentNav : mainNav;
  const { sentinel, scrolled } = useScrolled();
  const toggleLang = () => setLang((current) => (current === "ID" ? "EN" : "ID"));

  return (
    <>
      {/* Watched instead of listening to `scroll`: the only question is "past 8px?". */}
      <div ref={sentinel} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-2" />

      <header className="sticky top-0 z-50">
        <div
          aria-hidden="true"
          data-slot="navbar-surface"
          className={cn(
            "absolute inset-0 -z-10 border-b border-border bg-background/70 backdrop-blur-md transition-opacity duration-200 ease-out-strong motion-reduce:duration-100",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        />

        <Container className="flex h-16 items-center justify-between gap-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="justify-self-start">
            <Brand />
          </div>

          {/* Centred links - desktop only. Keyed so a guest -> member swap fades. */}
          <nav aria-label="Navigasi utama" className="hidden md:block">
            <div key={session ? "member" : "guest"} className="enter-fade flex items-center gap-1">
              {navigation.map((item) => (
                <NavItemLink key={item.href} href={item.href} label={item.label} />
              ))}
            </div>
          </nav>

          {/* Right cluster - desktop */}
          <div className="hidden items-center justify-end gap-1.5 md:flex">
            <LangToggle lang={lang} onToggle={toggleLang} />
            <SessionActions />
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            <MobileMenu navigation={navigation} lang={lang} onToggleLang={toggleLang} />
          </div>
        </Container>
      </header>
    </>
  );
}

function useScrolled() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(entry ? !entry.isIntersecting : false),
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { sentinel, scrolled };
}

function NavItemLink({ href, label }: { href: string; label: string }) {
  return (
    <NavLink
      to={href}
      end={href === "/"}
      prefetch="intent"
      className="group relative isolate rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-[color,scale] duration-150 ease-out-strong hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] motion-reduce:active:scale-100 aria-[current=page]:text-foreground"
    >
      {({ isActive }) => (
        <>
          {/* offset highlight block for the active link (the DESIGN.md section motif) */}
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-x-1.5 bottom-1.5 -z-10 h-1/3 -rotate-1 rounded-md bg-brand-mint-soft",
              isActive ? "opacity-100" : "opacity-0",
            )}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

// NOTE: nothing is translated yet, so this only flips the label. Kept because
// DESIGN.md asks for it; remove it if i18n is not on the roadmap.
function LangToggle({ lang, onToggle }: { lang: "ID" | "EN"; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      onClick={onToggle}
      aria-label={`Bahasa: ${lang}. Ganti bahasa.`}
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
          <Button variant="ghost" size="icon" aria-label="Buka menu">
            <Menu />
          </Button>
        }
      />
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Brand />
        </SheetHeader>
        <nav aria-label="Navigasi utama" className="mt-2 flex flex-col px-4">
          {navigation.map((item, index) => (
            <SheetClose
              key={item.href}
              render={
                <NavLink
                  to={item.href}
                  end={item.href === "/"}
                  prefetch="intent"
                  // The drawer opens now and then, so its rows rise in one after another.
                  style={{ "--i": index } as CSSProperties}
                  className="enter-up border-b border-border/60 py-3 text-base font-medium text-foreground/80 transition-colors duration-150 ease-out-strong hover:text-foreground active:bg-muted/50 aria-[current=page]:text-foreground"
                >
                  {item.label}
                </NavLink>
              }
            />
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 p-4">
          <SessionActions layout="sheet" />
          <Button variant="outline" size="sm" className="self-start" onClick={onToggleLang}>
            <Languages data-icon="inline-start" />
            {lang}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

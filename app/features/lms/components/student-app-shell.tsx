import { lazy, Suspense, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  PrefetchPageLinks,
  useLocation,
  useNavigate,
  useNavigation,
  useRevalidator,
} from "react-router";
import {
  BookOpen,
  GraduationCap,
  Award,
  Globe2,
  LayoutDashboard,
  LogOut,
  PencilRuler,
  type LucideIcon,
} from "lucide-react";

import { Brand } from "~/components/layout/brand";
import { cn } from "~/lib/utils";
import { ThemeToggle } from "~/components/layout/theme-toggle";
import { GameFeelRoot, GameHud, GameToaster, SoundToggle } from "~/features/game-feel";
import { Separator } from "~/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { Spinner } from "~/components/ui/spinner";
import { studentNav } from "~/config";
import { authClient } from "~/lib/auth-client";
import { onStaleRefreshed } from "~/lib/http";
import { forgetSignedIn } from "~/lib/session-hint";
import { prefetchStudentPage } from "../api/student";
import { isWorldPath, useWorld3d, WorldModeToggle, WorldOverlayContext } from "../world3d";
import { StudentRouteSkeleton } from "./loading-skeletons";
import type { StudentShellData } from "../types";

// three.js and the world model load only when a world route opens in 3D.
const WorldStage = lazy(() => import("../world3d/stage"));

const navigationIcons: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dunia": Globe2,
  "/lencana": Award,
  "/manage": PencilRuler,
};

// Courses (islands), lessons, quizzes and assignments belong to "Dunia" even though their
// URLs do not start with /courses.
function sectionFor(pathname: string) {
  if (pathname.startsWith("/manage")) return "/manage";
  if (pathname === "/dashboard") return "/dashboard";
  if (pathname === "/dunia") return "/dunia";
  if (pathname === "/lencana") return "/lencana";
  return "/dunia";
}

function isAppPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname === "/dunia" ||
    pathname === "/lencana" ||
    pathname === "/courses" ||
    pathname.startsWith("/courses/") ||
    pathname === "/manage" ||
    pathname.startsWith("/manage/") ||
    pathname.startsWith("/lessons/") ||
    pathname.startsWith("/assignments/") ||
    pathname.startsWith("/quizzes/")
  );
}

// The page being left stays on screen while the next one loads, so a fast load
// swaps straight to the new page. Only a load still running after this delay
// shows the next page's skeleton.
const SKELETON_DELAY_MS = 300;
// Hover shorter than this (the pointer passing over a link) does not prefetch.
const HOVER_INTENT_MS = 80;

function useDelayed(value: string | null, ms: number) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!value) return setShown(null);
    const timer = window.setTimeout(() => setShown(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return shown === value ? value : null;
}

/** Prefetches the code and data of an app page as soon as its link is hovered, focused or touched. */
function usePrefetchOnIntent(currentPathname: string) {
  const [pathname, setPathname] = useState<string | null>(null);
  useEffect(() => {
    let scheduled: string | null = null;
    let timer: number | undefined;
    function onIntent(event: Event) {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a[href]");
      const next =
        link instanceof HTMLAnchorElement && link.origin === window.location.origin
          ? link.pathname
          : null;
      if (next === scheduled) return;
      window.clearTimeout(timer);
      scheduled = next;
      if (!next || next === window.location.pathname || !isAppPath(next)) return;
      timer = window.setTimeout(
        () => {
          prefetchStudentPage(next);
          setPathname(next);
        },
        event.type === "pointerover" ? HOVER_INTENT_MS : 0,
      );
    }
    document.addEventListener("pointerover", onIntent);
    document.addEventListener("focusin", onIntent);
    document.addEventListener("touchstart", onIntent, { passive: true });
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
      document.removeEventListener("touchstart", onIntent);
    };
  }, []);
  return pathname && pathname !== currentPathname ? pathname : null;
}

// Once the browser is idle after the app has loaded: the pages a student opens
// most get their code and data, and the other student pages their code (any id
// matches the route), so no first visit waits for a download and then the data.
const IDLE_PAGES = ["/dashboard", "/dunia", "/lencana"];
const IDLE_CODE = ["/courses/_", "/courses/_/kelas", "/courses/_/balai/_", "/lessons/_", "/assignments/_", "/quizzes/_"];

function useIdlePrefetch() {
  const [pages, setPages] = useState<string[]>([]);
  useEffect(() => {
    const warm = () => {
      setPages([...IDLE_PAGES, ...IDLE_CODE]);
      IDLE_PAGES.forEach((page) => prefetchStudentPage(page));
    };
    // Safari has no requestIdleCallback: a short timeout instead.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 1500);
    return () => clearTimeout(id);
  }, []);
  return pages;
}

export function StudentAppShell({ data }: { data: StudentShellData }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [signingOut, setSigningOut] = useState(false);
  // The sidebar follows the page being opened, so a click is acknowledged before it loads.
  const section = sectionFor(navigation.location?.pathname ?? location.pathname);
  const sectionLabel = studentNav.find((item) => item.href === section)?.label;
  // A load on the same page (a form on it, a refresh) never unmounts it.
  const leavingFor =
    navigation.state === "loading" &&
    navigation.location.pathname !== location.pathname &&
    isAppPath(navigation.location.pathname)
      ? navigation.location.pathname
      : null;
  const skeletonPathname = useDelayed(leavingFor, SKELETON_DELAY_MS);
  const prefetchPathname = usePrefetchOnIntent(location.pathname);
  // Dunia, an island and its halls share one 3D canvas that stays mounted
  // between them; each route draws its buttons into the layer over it.
  const world3d = useWorld3d();
  const inWorld = world3d && isWorldPath(location.pathname);
  // The camera already flies to the next world route; its old cards step aside.
  const flying = inWorld && navigation.state === "loading" && isWorldPath(navigation.location.pathname);
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  const idlePages = useIdlePrefetch();
  // A page shown from a stale copy refreshes when the fresh copy differs.
  const revalidator = useRevalidator();
  useEffect(() => onStaleRefreshed(() => void revalidator.revalidate()), [revalidator]);

  async function signOut() {
    setSigningOut(true);
    const { error } = await authClient.signOut();
    if (!error) {
      forgetSignedIn();
      navigate("/", { replace: true });
    }
    setSigningOut(false);
  }

  const initials = data.user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <div className="flex h-12 items-center px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <div className="shrink-0 group-data-[collapsible=icon]:hidden">
              <Brand className="h-7" to="/dashboard" />
            </div>
            <Link
              to="/dashboard"
              aria-label="NALAR Dashboard"
              className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground group-data-[collapsible=icon]:flex"
            >
              <GraduationCap className="size-4" />
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Belajar</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {studentNav.map((item) => {
                  const Icon = navigationIcons[item.href] ?? BookOpen;
                  const active = item.href === section;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        render={<NavLink to={item.href} />}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip={data.user.name}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {initials || "S"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{data.user.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {data.user.email}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={signOut}
                disabled={signingOut}
                tooltip="Keluar"
              >
                {signingOut ? <Spinner /> : <LogOut />}
                <span>Keluar</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        {prefetchPathname && <PrefetchPageLinks page={prefetchPathname} />}
        {idlePages.map((page) => <PrefetchPageLinks key={page} page={page} />)}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur-sm sm:px-6 lg:rounded-t-xl lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger aria-label="Buka navigasi" className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-center" />
            <p className="truncate text-sm font-medium">{sectionLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {isWorldPath(location.pathname) && <WorldModeToggle />}
            <GameHud />
            <SoundToggle />
            <ThemeToggle />
          </div>
          {navigation.state !== "idle" && (
            <div
              data-nav-progress
              aria-hidden
              className="nav-progress absolute inset-x-0 bottom-0 h-0.5 bg-primary"
            />
          )}
        </header>
        {inWorld ? (
          <main className="relative h-[calc(100dvh-3.5rem-4rem-env(safe-area-inset-bottom))] overflow-hidden md:h-[calc(100dvh-3.5rem)] lg:h-[calc(100dvh-3.5rem-1rem)] lg:rounded-b-xl">
            <Suspense fallback={null}>
              <WorldStage />
            </Suspense>
            <div
              ref={setOverlay}
              className={cn(
                "pointer-events-none absolute inset-0 z-10 transition-opacity duration-150 ease-out",
                flying && "opacity-0",
              )}
            />
            <WorldOverlayContext.Provider value={overlay}>
              <Outlet />
            </WorldOverlayContext.Provider>
          </main>
        ) : (
          <main className="flex-1 px-4 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-8 lg:px-10 lg:py-10">
            <div className="mx-auto w-full max-w-7xl">
              {skeletonPathname ? (
                <StudentRouteSkeleton pathname={skeletonPathname} />
              ) : (
                <Outlet />
              )}
            </div>
          </main>
        )}
        <BottomNav section={section} />
        <GameFeelRoot />
        <GameToaster />
      </SidebarInset>
    </SidebarProvider>
  );
}

const shortLabels: Record<string, string> = {
  "/dashboard": "Beranda",
  "/manage": "Kelola",
};

// On phones the four destinations sit under the thumb, as in the canvas
// "Dunia (HP)"; the sidebar stays for wider screens.
function BottomNav({ section }: { section: string }) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {studentNav.map((item) => {
          const Icon = navigationIcons[item.href] ?? BookOpen;
          const active = item.href === section;
          return (
            <li key={item.href} className="flex-1">
              <NavLink
                to={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold transition-colors duration-150",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150",
                    active && "bg-brand-lavender-soft text-brand-lavender-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {shortLabels[item.href] ?? item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

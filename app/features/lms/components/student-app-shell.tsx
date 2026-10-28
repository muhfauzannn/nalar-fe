import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  PrefetchPageLinks,
  useLocation,
  useNavigate,
  useNavigation,
} from "react-router";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  PencilRuler,
  type LucideIcon,
} from "lucide-react";

import { Brand } from "~/components/layout/brand";
import { ThemeToggle } from "~/components/layout/theme-toggle";
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
import { prefetchStudentPage } from "../api/student";
import { StudentRouteSkeleton } from "./loading-skeletons";
import type { StudentShellData } from "../types";

const navigationIcons: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/courses": BookOpen,
  "/manage": PencilRuler,
};

// Lessons, quizzes and assignments belong to "Course saya" even though their
// URLs do not start with /courses.
function sectionFor(pathname: string) {
  if (pathname.startsWith("/manage")) return "/manage";
  if (pathname === "/dashboard") return "/dashboard";
  return "/courses";
}

function isAppPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
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

  async function signOut() {
    setSigningOut(true);
    const { error } = await authClient.signOut();
    if (!error) navigate("/", { replace: true });
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
              <Brand className="h-7" />
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
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur-sm sm:px-6 lg:rounded-t-xl lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger aria-label="Buka navigasi" className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-center" />
            <p className="truncate text-sm font-medium">{sectionLabel}</p>
          </div>
          <ThemeToggle />
          {navigation.state !== "idle" && (
            <div
              data-nav-progress
              aria-hidden
              className="nav-progress absolute inset-x-0 bottom-0 h-0.5 bg-primary"
            />
          )}
        </header>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-7xl">
            {skeletonPathname ? (
              <StudentRouteSkeleton pathname={skeletonPathname} />
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

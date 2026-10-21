import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
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

export function StudentAppShell({ data }: { data: StudentShellData }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [signingOut, setSigningOut] = useState(false);
  const section = sectionFor(location.pathname);
  const sectionLabel = studentNav.find((item) => item.href === section)?.label;
  const nextPathname = navigation.state === "loading" ? navigation.location.pathname : null;
  const loadingPathname =
    nextPathname &&
    (nextPathname === "/dashboard" ||
      nextPathname === "/courses" ||
      nextPathname.startsWith("/courses/") ||
      nextPathname === "/manage" ||
      nextPathname.startsWith("/manage/") ||
      nextPathname.startsWith("/lessons/") ||
      nextPathname.startsWith("/assignments/") ||
      nextPathname.startsWith("/quizzes/"))
      ? nextPathname
      : null;

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
          <div className="flex h-12 items-center px-3 group-data-[collapsible=icon]:px-0">
            <Brand className="h-7 group-data-[collapsible=icon]:hidden" />
            <Link
              to="/dashboard"
              aria-label="NALAR Dashboard"
              className="hidden size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground group-data-[collapsible=icon]:flex"
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
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur-sm sm:px-6 lg:rounded-t-xl lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger aria-label="Buka navigasi" className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-center" />
            <p className="truncate text-sm font-medium">{sectionLabel}</p>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-7xl">
            {loadingPathname ? (
              <StudentRouteSkeleton pathname={loadingPathname} />
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

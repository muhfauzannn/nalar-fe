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
  type LucideIcon,
} from "lucide-react";

import { Brand } from "~/components/layout/brand";
import { ThemeToggle } from "~/components/layout/theme-toggle";
import { Button } from "~/components/ui/button";
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
};

export function StudentAppShell({ data }: { data: StudentShellData }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [signingOut, setSigningOut] = useState(false);
  const nextPathname = navigation.state === "loading" ? navigation.location.pathname : null;
  const loadingPathname =
    nextPathname &&
    (nextPathname === "/dashboard" ||
      nextPathname === "/courses" ||
      nextPathname.startsWith("/courses/") ||
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
                  const active =
                    location.pathname === item.href ||
                    (item.href !== "/dashboard" && location.pathname.startsWith(`${item.href}/`));
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
                    {data.school?.name ?? "Belum terhubung ke sekolah"}
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
        <header className="sticky top-0 flex h-16 items-center justify-between border-b bg-background/90 px-5 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger aria-label="Buka navigasi" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium">{data.school?.name ?? "NALAR"}</p>
              <p className="text-xs text-muted-foreground">
                {data.school?.gradeLevel ? `Kelas ${data.school.gradeLevel}` : "Ruang belajar siswa"}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 px-5 py-8 sm:px-6 md:py-10 lg:px-10 lg:py-12">
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

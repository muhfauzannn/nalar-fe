import { LogOut } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { useSession } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import { useSignOut } from "./use-sign-out";

type User = { name: string; email: string };
type Layout = "bar" | "sheet";

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  return letters || "A";
}

/**
 * Who is signed in, as the navbar needs it.
 *  - bar:   guest -> "Masuk"; member -> an avatar that opens a small account card.
 *  - sheet: the same, laid out for the mobile menu (no popover inside a drawer).
 * While the session is still being checked a fixed-size placeholder holds the
 * space, so nothing reads "Memuat" and the bar does not jump.
 */
export function SessionActions({ layout = "bar" }: { layout?: Layout }) {
  const { data: session, isPending } = useSession();
  const signOut = useSignOut();

  if (isPending) {
    return (
      <div
        data-testid="session-pending"
        role="status"
        aria-label="Memeriksa sesi"
        className={cn(
          "rounded-full bg-muted/60",
          layout === "sheet" ? "h-12 w-full rounded-xl" : "h-9 w-20",
        )}
      />
    );
  }

  if (!session) {
    return (
      <Button
        size={layout === "sheet" ? "lg" : "default"}
        className={cn("enter-fade", layout === "sheet" && "w-full")}
        render={<Link to="/login" />}
      >
        Masuk
      </Button>
    );
  }

  return layout === "bar" ? (
    <AccountMenu user={session.user} {...signOut} />
  ) : (
    <AccountCard user={session.user} {...signOut} />
  );
}

type SignOut = ReturnType<typeof useSignOut>;

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

function Identity({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={user.name} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

function SignOutButton({ signOut, pending, failed }: SignOut) {
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" className="w-full" loading={pending} onClick={signOut}>
        <LogOut data-icon="inline-start" />
        {failed ? "Coba lagi" : "Keluar"}
      </Button>
      {failed ? (
        <p role="alert" className="enter-up text-xs text-destructive">
          Keluar gagal. Periksa koneksi lalu coba lagi.
        </p>
      ) : null}
    </div>
  );
}

function AccountMenu({ user, ...signOut }: { user: User } & SignOut) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            size="icon"
            className="enter-fade rounded-full text-xs font-semibold"
            aria-label={`Menu akun, ${user.name}`}
          />
        }
      >
        {initials(user.name)}
      </PopoverTrigger>
      {/* Grows out of the avatar (origin-aware); 150ms in, 100ms out. */}
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 gap-3 p-3 data-open:duration-150 data-closed:duration-100"
      >
        <Identity user={user} />
        <Separator />
        <SignOutButton {...signOut} />
      </PopoverContent>
    </Popover>
  );
}

function AccountCard({ user, ...signOut }: { user: User } & SignOut) {
  return (
    <div className="enter-fade flex flex-col gap-3 rounded-xl border bg-muted/30 p-3">
      <Identity user={user} />
      <SignOutButton {...signOut} />
    </div>
  );
}

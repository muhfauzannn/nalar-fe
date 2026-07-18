import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { LogOut } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { authClient, useSession } from "~/lib/auth-client";
import { cn } from "~/lib/utils";

/** User-only navigation state for the current student-facing frontend. */
export function SessionActions({ grow = false }: { grow?: boolean }) {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutFailed(false);

    try {
      const { error } = await authClient.signOut();
      if (error) {
        setSignOutFailed(true);
        return;
      }
      navigate("/", { replace: true });
    } catch {
      setSignOutFailed(true);
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isPending) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(grow && "flex-1")}
        disabled
      >
        <Spinner data-icon="inline-start" />
        Memuat
      </Button>
    );
  }

  if (!session) {
    return (
      <Button
        size="sm"
        className={cn(grow && "flex-1")}
        render={<Link to="/login" />}
      >
        Masuk
      </Button>
    );
  }

  const displayName = session.user.name.trim().split(/\s+/)[0] || "Akun";

  return (
    <div className={cn("flex min-w-0 items-center gap-2", grow && "flex-1")}>
      <span className="max-w-28 truncate text-sm font-medium">{displayName}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(grow && "flex-1")}
        onClick={handleSignOut}
        disabled={isSigningOut}
        title={signOutFailed ? "Keluar gagal. Coba lagi." : undefined}
      >
        {isSigningOut ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <LogOut data-icon="inline-start" />
        )}
        {signOutFailed ? "Coba lagi" : "Keluar"}
      </Button>
    </div>
  );
}

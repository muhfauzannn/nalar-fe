import { useState } from "react";
import { useNavigate } from "react-router";

import { authClient } from "~/lib/auth-client";
import { forgetSignedIn } from "~/lib/session-hint";

// One sign-out flow for the account menu (desktop) and the account card (mobile).
export function useSignOut() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        setFailed(true);
        return;
      }
      forgetSignedIn();
      navigate("/", { replace: true });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return { signOut, pending, failed };
}

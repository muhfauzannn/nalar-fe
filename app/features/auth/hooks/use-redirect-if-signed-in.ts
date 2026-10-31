import { useEffect } from "react";
import { useNavigate } from "react-router";

import { authClient } from "~/lib/auth-client";
import { rememberSignedIn } from "~/lib/session-hint";

/**
 * Sends a signed-in visitor of a public page (the landing page) on to `to`.
 *
 * The session cookie belongs to the API origin, so the SSR server never sees it
 * and a route `loader` cannot tell who is asking: the check has to run in the
 * browser. The public page is still server-rendered for guests and crawlers.
 *
 * It asks the API directly instead of reading `useSession()`. That store
 * refreshes in a `setTimeout` after sign-out, and `useSignOut` navigates to `/`
 * before it does, so for a moment it still holds the user who just left and
 * would bounce them straight back to the app.
 */
export function useRedirectIfSignedIn(to: string) {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    authClient
      .getSession()
      .then(({ data }) => {
        if (!data) return;
        // Next visit the server redirects before sending the page (see session-hint).
        rememberSignedIn();
        if (!cancelled) navigate(to, { replace: true });
      })
      // An unreachable API just leaves the visitor on the public page.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [navigate, to]);
}

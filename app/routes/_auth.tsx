import { Outlet } from "react-router";

import { AuthShell } from "~/features/auth";

/**
 * Pathless layout route (`_` prefix → contributes no URL segment) for the auth
 * flow. Owns the persistent `AuthShell` chrome (brand + illustration), so the
 * left panel stays mounted while `<Outlet/>` swaps between `/login` and
 * `/register` — the transition is smooth. Lives OUTSIDE `_site`, so there is no
 * Navbar/Footer.
 */
export default function AuthLayout() {
  return (
    <AuthShell>
      <Outlet />
    </AuthShell>
  );
}

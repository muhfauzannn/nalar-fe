import { Outlet } from "react-router";

import { Navbar } from "~/components/layout/navbar";
import { Footer } from "~/components/layout/footer";

/**
 * Pathless layout route (`_` prefix → contributes no URL segment). Owns the
 * global site chrome: every page nested under it renders inside
 * `<Navbar/> · <main> · <Footer/>`. The 404 splat route (`routes/$.tsx`) is
 * intentionally NOT nested here, so it renders bare — no navbar, no footer.
 */
export default function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

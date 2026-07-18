import { data } from "react-router";

import type { Route } from "./+types/$";
import { NotFoundPage } from "~/features/not-found";
import { siteConfig } from "~/config";

export function meta(_: Route.MetaArgs) {
  return [
    { title: `Halaman tidak ditemukan · ${siteConfig.name}` },
    { name: "robots", content: "noindex" },
  ];
}

// Catch-all splat route: any URL not matched by a real route lands here. It
// lives at the top level (NOT under the `_site` layout), so the 404 renders
// without Navbar/Footer. Return a real 404 status so crawlers/clients see it.
export function loader(_: Route.LoaderArgs) {
  return data(null, { status: 404 });
}

export default function NotFoundRoute() {
  return <NotFoundPage />;
}

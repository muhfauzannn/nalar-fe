import type { Route } from "./+types/_auth.register";
import { RegisterPage } from "~/features/auth";
import { siteConfig } from "~/config";

export function meta(_: Route.MetaArgs) {
  return [{ title: `Daftar · ${siteConfig.name}` }];
}

// Nested under the `_auth` layout → renders only the form column; the shared
// illustration chrome persists across the /login ↔ /register switch.
export default function RegisterRoute() {
  return <RegisterPage />;
}

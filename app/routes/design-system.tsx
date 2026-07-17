import type { Route } from "./+types/design-system";
import { DesignSystemPage } from "~/features/design-system";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Design system · Bernalar" },
    { name: "robots", content: "noindex" },
  ];
}

export default function DesignSystemRoute() {
  return <DesignSystemPage />;
}

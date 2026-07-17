import type { Route } from "./+types/_index";
import { getHomeContent, HomePage } from "~/features/home";
import { siteConfig } from "~/config";

export function meta(_: Route.MetaArgs) {
  return [
    { title: siteConfig.name },
    { name: "description", content: siteConfig.description },
  ];
}

export async function loader(_: Route.LoaderArgs) {
  return { content: await getHomeContent() };
}

// Route modules stay thin: wire up data + metadata, then render the feature page.
export default function HomeRoute({ loaderData }: Route.ComponentProps) {
  return <HomePage content={loaderData.content} />;
}

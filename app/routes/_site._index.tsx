import type { Route } from "./+types/_site._index";
import { useRedirectIfSignedIn } from "~/features/auth";
import { getHomeContent, HomePage } from "~/features/home";
import { postAuthPath, siteConfig } from "~/config";

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
  useRedirectIfSignedIn(postAuthPath);
  return <HomePage content={loaderData.content} />;
}

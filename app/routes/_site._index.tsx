import { redirect } from "react-router";

import type { Route } from "./+types/_site._index";
import { useRedirectIfSignedIn } from "~/features/auth";
import { getHomeContent, HomePage } from "~/features/home";
import { postAuthPath, siteConfig } from "~/config";
import { hasSignedInHint } from "~/lib/session-hint";

export function meta(_: Route.MetaArgs) {
  return [
    { title: siteConfig.name },
    { name: "description", content: siteConfig.description },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // A signed-in student never sees the landing page: redirect before sending it.
  if (hasSignedInHint(request)) throw redirect(postAuthPath);
  return { content: await getHomeContent() };
}

// Route modules stay thin: wire up data + metadata, then render the feature page.
export default function HomeRoute({ loaderData }: Route.ComponentProps) {
  useRedirectIfSignedIn(postAuthPath);
  return <HomePage content={loaderData.content} />;
}

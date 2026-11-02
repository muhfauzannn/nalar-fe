import { ApplicationLoadingBoundary } from "~/features/loading/application-boundary";
import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation, useRouteError, type ShouldRevalidateFunctionArgs } from "react-router";
import { useEffect } from "react";

import type { Route } from "./+types/_app";
import {
  StudentAppShell,
  studentApi,
} from "~/features/lms";
import { clearRecentReads } from "~/lib/http";
import { rememberSignedIn } from "~/lib/session-hint";

let signedInAs: string | null = null;

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const shell = await studentApi.shell(request);
  // Another account than the last one in this tab: never reuse its reads. (A new
  // tab starts empty, and signing out clears them; clearing on the first load
  // would also drop what the page's own loaders just read.)
  if (signedInAs && signedInAs !== shell.user.id) clearRecentReads();
  signedInAs = shell.user.id;
  rememberSignedIn();
  return shell;
}

// The shell (who is signed in, their profile) only changes through a form
// action or an explicit refresh. Moving between pages, above all between the
// places of the 3D world, must not wait for it or wipe the recent reads.
export function shouldRevalidate({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  const sameUrl = currentUrl.pathname === nextUrl.pathname && currentUrl.search === nextUrl.search;
  return formMethod || sameUrl ? defaultShouldRevalidate : false;
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export default function StudentAppLayout({ loaderData }: Route.ComponentProps) {
  return <ApplicationLoadingBoundary><StudentAppShell data={loaderData} /></ApplicationLoadingBoundary>;
}

export function ErrorBoundary() {
  const { pathname } = useLocation();
  const error = useRouteError();
  useEffect(() => { console.error("[loading] Route data failed", error); }, [error]);
  return <ApplicationLoader pathname={pathname} error="Data halaman belum dapat dimuat. Periksa koneksi lalu coba lagi." />;
}

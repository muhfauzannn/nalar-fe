import { useLocation } from "react-router";

import type { Route } from "./+types/_app";
import {
  StudentAppShell,
  StudentAppShellSkeleton,
  studentApi,
} from "~/features/lms";
import { clearRecentReads } from "~/lib/http";
import { rememberSignedIn } from "~/lib/session-hint";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  // Runs when the app is entered (after sign-in too): never reuse another account's reads.
  clearRecentReads();
  const shell = await studentApi.shell(request);
  rememberSignedIn();
  return shell;
}

export function HydrateFallback() {
  // The first paint shows the skeleton of the page being opened, not always the dashboard's.
  const { pathname } = useLocation();
  return <StudentAppShellSkeleton pathname={pathname} />;
}

export default function StudentAppLayout({ loaderData }: Route.ComponentProps) {
  return <StudentAppShell data={loaderData} />;
}

import { useLocation } from "react-router";

import type { Route } from "./+types/_app";
import {
  StudentAppShell,
  StudentAppShellSkeleton,
  studentApi,
} from "~/features/lms";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return studentApi.shell(request);
}

export function HydrateFallback() {
  // The first paint shows the skeleton of the page being opened, not always the dashboard's.
  const { pathname } = useLocation();
  return <StudentAppShellSkeleton pathname={pathname} />;
}

export default function StudentAppLayout({ loaderData }: Route.ComponentProps) {
  return <StudentAppShell data={loaderData} />;
}

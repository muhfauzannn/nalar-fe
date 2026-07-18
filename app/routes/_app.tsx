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
  return <StudentAppShellSkeleton />;
}

export default function StudentAppLayout({ loaderData }: Route.ComponentProps) {
  return <StudentAppShell data={loaderData} />;
}

import { Suspense } from "react";
import { Await } from "react-router";

import type { Route } from "./+types/_app.dashboard";
import {
  DashboardPage,
  DashboardPageSkeleton,
  studentApi,
} from "~/features/lms";

// Return the fetch as a pending promise instead of awaiting it. The route then
// commits immediately (no frozen transition), and the skeleton streams in via
// <Await> while the data loads. Auth stays enforced by the parent `_app`
// loader, which blocks and redirects on 401 before this route ever renders.
export function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { dashboard: studentApi.dashboard(request) };
}

export function HydrateFallback() {
  return <DashboardPageSkeleton />;
}

export function meta() {
  return [{ title: "Dashboard Siswa | NALAR" }];
}

export default function DashboardRoute({ loaderData }: Route.ComponentProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <Await resolve={loaderData.dashboard}>
        {(data) => <DashboardPage data={data} />}
      </Await>
    </Suspense>
  );
}

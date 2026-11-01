import type { Route } from "./+types/_app.lencana";
import { BadgesPage, DashboardPageSkeleton, studentApi } from "~/features/lms";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return studentApi.points(request);
}

export function HydrateFallback() {
  return <DashboardPageSkeleton />;
}

export function meta() {
  return [{ title: "Lencana | NALAR" }];
}

export default function BadgesRoute({ loaderData }: Route.ComponentProps) {
  return <BadgesPage data={loaderData} />;
}

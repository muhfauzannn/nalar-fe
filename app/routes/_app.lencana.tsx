import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation } from "react-router";
import type { Route } from "./+types/_app.lencana";
import { BadgesPage, studentApi } from "~/features/lms";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return studentApi.points(request);
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export function meta() {
  return [{ title: "Lencana | NALAR" }];
}

export default function BadgesRoute({ loaderData }: Route.ComponentProps) {
  return <BadgesPage data={loaderData} />;
}

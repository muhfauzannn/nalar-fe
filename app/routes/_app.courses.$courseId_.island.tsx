import { redirect } from "react-router";

import type { Route } from "./+types/_app.courses.$courseId_.island";

// The old island address: the course itself is the island now, and a hall has
// its own page.
export function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  const hall = new URL(request.url).searchParams.get("tugas");
  throw redirect(hall ? `/courses/${params.courseId}/balai/${hall}` : `/courses/${params.courseId}`);
}

export default function OldIslandRoute() {
  return null;
}

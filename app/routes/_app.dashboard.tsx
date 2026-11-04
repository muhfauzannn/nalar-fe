import { redirect } from "react-router";

import { ApplicationLoader } from "~/features/loading/application-loader";

// There is no dashboard any more: the world is the home, and its Tenggat has
// what the dashboard listed. Old links and bookmarks land there.
export function clientLoader() {
  return redirect("/dunia");
}

export function HydrateFallback() {
  return <ApplicationLoader pathname="/dunia" initial />;
}

export default function DashboardRoute() {
  return null;
}

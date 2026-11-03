import { Navigate, useSearchParams } from "react-router";

import type { Route } from "./+types/_app.courses.join";
import { joinCourseAction, JoinCoursePage } from "~/features/authoring";
import { joinUrl, useWorld3d } from "~/features/lms";

export async function clientAction(args: Route.ClientActionArgs) {
  return joinCourseAction(args);
}

export function meta() {
  return [{ title: "Gabung Course | NALAR" }];
}

export default function JoinCourseRoute({ actionData }: Route.ComponentProps) {
  const [params] = useSearchParams();
  const world3d = useWorld3d();
  // In the 3D world joining is a sheet over the canvas; this page is for the 2D
  // world, and for old invite links (?code=) that still point here.
  if (world3d) return <Navigate to={joinUrl(params.get("code"))} replace />;
  return <JoinCoursePage result={actionData} />;
}

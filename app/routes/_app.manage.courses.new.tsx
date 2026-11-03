import { ApplicationLoader } from "~/features/loading/application-loader";
import { redirect, useLocation } from "react-router";
import type { Route } from "./+types/_app.manage.courses.new";
import { newCourseAction, NEW_COURSE_URL } from "~/features/authoring";

// Creating a course is a sheet over the list now (/manage?buat). This address stays
// for the links that already point here, and as the action the sheet posts to.
export function clientLoader() {
  return redirect(NEW_COURSE_URL);
}

export async function clientAction(args: Route.ClientActionArgs) {
  return newCourseAction(args);
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export function meta() {
  return [{ title: "Buat Course | NALAR" }];
}

export default function NewCourseRoute() {
  return null;
}

import type { Route } from "./+types/_app.manage.courses.new";
import { ActivityPageSkeleton } from "~/features/lms";
import { manageApi, newCourseAction, NewCoursePage } from "~/features/authoring";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return manageApi.subjects(request);
}

export async function clientAction(args: Route.ClientActionArgs) {
  return newCourseAction(args);
}

export function HydrateFallback() {
  return <ActivityPageSkeleton />;
}

export function meta() {
  return [{ title: "Buat Course | NALAR" }];
}

export default function NewCourseRoute({ loaderData, actionData }: Route.ComponentProps) {
  return <NewCoursePage subjects={loaderData.subjects} result={actionData} />;
}

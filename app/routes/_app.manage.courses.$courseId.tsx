import type { Route } from "./+types/_app.manage.courses.$courseId";
import { ActivityPageSkeleton } from "~/features/lms";
import { courseEditorAction, CourseEditorPage, manageApi } from "~/features/authoring";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.courseId) throw new Response("Course tidak ditemukan", { status: 404 });
  const [data, subjects, scenarios] = await Promise.all([
    manageApi.course(request, params.courseId),
    manageApi.subjects(request),
    manageApi.scenarios(request),
  ]);
  return { data, subjects: subjects.subjects, scenarios: scenarios.scenarios };
}

export async function clientAction(args: Route.ClientActionArgs) {
  return courseEditorAction(args);
}

export function HydrateFallback() {
  return <ActivityPageSkeleton />;
}

export function meta() {
  return [{ title: "Kelola Course | NALAR" }];
}

export default function CourseEditorRoute({ loaderData }: Route.ComponentProps) {
  return (
    <CourseEditorPage
      data={loaderData.data}
      subjects={loaderData.subjects}
      scenarios={loaderData.scenarios}
    />
  );
}

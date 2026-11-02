import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation } from "react-router";
import type { Route } from "./+types/_app.manage.lessons.$lessonId";
import { lessonEditorAction, LessonEditorPage, manageApi } from "~/features/authoring";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.lessonId) throw new Response("Lesson tidak ditemukan", { status: 404 });
  return manageApi.lesson(request, params.lessonId);
}

export async function clientAction(args: Route.ClientActionArgs) {
  return lessonEditorAction(args);
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export function meta() {
  return [{ title: "Edit Lesson | NALAR" }];
}

export default function LessonEditorRoute({ loaderData }: Route.ComponentProps) {
  return <LessonEditorPage data={loaderData} />;
}

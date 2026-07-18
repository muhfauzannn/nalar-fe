import { redirect } from "react-router";

import type { Route } from "./+types/_app.lessons.$lessonId";
import {
  LessonPage,
  LessonPageSkeleton,
  studentApi,
} from "~/features/lms";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.lessonId) throw new Response("Materi tidak ditemukan", { status: 404 });
  return studentApi.lesson(request, params.lessonId);
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  if (!params.lessonId) throw new Response("Materi tidak ditemukan", { status: 404 });
  const formData = await request.formData();
  const status = formData.get("status");
  if (status !== "in_progress" && status !== "completed") {
    throw new Response("Status tidak valid", { status: 400 });
  }
  await studentApi.setLessonProgress(request, params.lessonId, status);
  return redirect(`/lessons/${params.lessonId}`);
}

export function HydrateFallback() {
  return <LessonPageSkeleton />;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Materi Course | NALAR" }];
}

export default function LessonRoute({ loaderData }: Route.ComponentProps) {
  return <LessonPage data={loaderData} />;
}

import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation } from "react-router";
import type { Route } from "./+types/_app.manage.quizzes.$quizId_.analytics";
import { manageApi, QuizAnalyticsPage } from "~/features/authoring";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.quizId) throw new Response("Kuis tidak ditemukan", { status: 404 });
  return manageApi.quizAnalytics(request, params.quizId);
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export function meta() {
  return [{ title: "Refleksi Tutor Kuis | NALAR" }];
}

export default function QuizAnalyticsRoute({ loaderData }: Route.ComponentProps) {
  return <QuizAnalyticsPage data={loaderData} />;
}

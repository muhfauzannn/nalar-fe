import { ApplicationLoader } from "~/features/loading/application-loader";
import { useLocation } from "react-router";
import { useActionData } from "react-router";

import type { Route } from "./+types/_app.assignments.$assignmentId";
import {
  AssignmentPage,
  studentApi,
  takeEarned,
} from "~/features/lms";
import { assignmentAction } from "~/features/lms/api/assignment-action";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.assignmentId) throw new Response("Tugas tidak ditemukan", { status: 404 });
  const data = await studentApi.assignment(request, params.assignmentId);
  return { ...data, earned: takeEarned(params.assignmentId) };
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  return assignmentAction(request, params.assignmentId);
}

export function HydrateFallback() {
  const { pathname } = useLocation();
  return <ApplicationLoader pathname={pathname} initial />;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tugas | NALAR" }];
}

export default function AssignmentRoute({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof clientAction>();
  return (
    <AssignmentPage
      data={loaderData}
      earned={loaderData.earned}
      actionError={actionData?.error}
      actionCode={actionData && "code" in actionData ? actionData.code : undefined}
      actionDraft={actionData && "draft" in actionData ? actionData.draft : undefined}
      actionStage={actionData && "stage" in actionData ? actionData.stage : undefined}
    />
  );
}

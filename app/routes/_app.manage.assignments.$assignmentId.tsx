import type { Route } from "./+types/_app.manage.assignments.$assignmentId";
import { ActivityPageSkeleton } from "~/features/lms";
import {
  AssignmentEditorPage,
  assignmentEditorAction,
  manageApi,
} from "~/features/authoring";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.assignmentId) throw new Response("Assignment tidak ditemukan", { status: 404 });
  return manageApi.assignment(request, params.assignmentId);
}

export async function clientAction(args: Route.ClientActionArgs) {
  return assignmentEditorAction(args);
}

export function HydrateFallback() {
  return <ActivityPageSkeleton />;
}

export function meta() {
  return [{ title: "Edit Assignment | NALAR" }];
}

export default function AssignmentEditorRoute({ loaderData }: Route.ComponentProps) {
  return <AssignmentEditorPage data={loaderData} />;
}

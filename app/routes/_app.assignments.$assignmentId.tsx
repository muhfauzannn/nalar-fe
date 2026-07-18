import { redirect, useActionData } from "react-router";

import type { Route } from "./+types/_app.assignments.$assignmentId";
import {
  ActivityPageSkeleton,
  AssignmentPage,
  studentApi,
  type WorkflowStage,
} from "~/features/lms";
import { HttpError } from "~/lib/http";

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.assignmentId) throw new Response("Assignment tidak ditemukan", { status: 404 });
  return studentApi.assignment(request, params.assignmentId);
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  if (!params.assignmentId) throw new Response("Assignment tidak ditemukan", { status: 404 });
  const formData = await request.formData();
  try {
    if (formData.get("intent") === "start") {
      await studentApi.startAssignment(request, params.assignmentId);
    } else {
      const submissionId = formData.get("submissionId");
      const stage = formData.get("stage") as WorkflowStage;
      const content = formData.get("content");
      if (typeof submissionId !== "string" || typeof content !== "string") {
        return { error: "Form assignment tidak valid." };
      }
      await studentApi.completeStage(request, submissionId, stage, content || undefined);
    }
    return redirect(`/assignments/${params.assignmentId}`);
  } catch (error) {
    if (error instanceof HttpError) return { error: error.message };
    throw error;
  }
}

export function HydrateFallback() {
  return <ActivityPageSkeleton />;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Assignment | NALAR" }];
}

export default function AssignmentRoute({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof clientAction>();
  return <AssignmentPage data={loaderData} actionError={actionData?.error} />;
}

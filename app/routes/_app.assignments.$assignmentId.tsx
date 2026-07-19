import { redirect, useActionData } from "react-router";

import type { Route } from "./+types/_app.assignments.$assignmentId";
import {
  AssignmentPageSkeleton,
  AssignmentPage,
  studentApi,
  type WorkflowStage,
} from "~/features/lms";
import { HttpError } from "~/lib/http";

const workflowStages: WorkflowStage[] = [
  "1_independent_effort",
  "2_guided_questioning",
  "3_ai_evaluation",
  "4_revision_finalization",
  "5_reflection",
];

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  if (!params.assignmentId) throw new Response("Assignment tidak ditemukan", { status: 404 });
  return studentApi.assignment(request, params.assignmentId);
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  if (!params.assignmentId) throw new Response("Assignment tidak ditemukan", { status: 404 });
  const formData = await request.formData();
  const intent = formData.get("intent");
  const submittedStage = formData.get("stage");
  const submittedContent = formData.get("content");
  try {
    if (intent === "start") {
      await studentApi.startAssignment(request, params.assignmentId);
    } else if (intent === "analyze") {
      const submissionId = formData.get("submissionId");
      if (typeof submissionId === "string") {
        await studentApi.analyzeSubmission(request, submissionId);
      }
    } else if (intent === "complete-stage") {
      const submissionId = formData.get("submissionId");
      if (
        typeof submissionId !== "string" ||
        typeof submittedStage !== "string" ||
        !workflowStages.includes(submittedStage as WorkflowStage) ||
        typeof submittedContent !== "string"
      ) {
        return {
          error: "Form assignment tidak valid. Muat ulang halaman lalu coba lagi.",
          code: "ASSIGNMENT_STAGE_INVALID" as const,
          draft: typeof submittedContent === "string" ? submittedContent : undefined,
          stage: typeof submittedStage === "string" ? submittedStage : undefined,
        };
      }
      await studentApi.completeStage(
        request,
        submissionId,
        submittedStage as WorkflowStage,
        submittedContent.trim() || undefined,
      );
    } else {
      return {
        error: "Aksi assignment tidak dikenali. Muat ulang halaman lalu coba lagi.",
        code: "ASSIGNMENT_SUBMIT_CONFLICT" as const,
        draft: typeof submittedContent === "string" ? submittedContent : undefined,
        stage: typeof submittedStage === "string" ? submittedStage : undefined,
      };
    }
    return redirect(`/assignments/${params.assignmentId}`);
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof HttpError) {
      if (
        error.code === "ASSIGNMENT_STAGE_OUT_OF_ORDER" ||
        error.code === "ASSIGNMENT_SUBMISSION_SUBMITTED"
      ) {
        return redirect(`/assignments/${params.assignmentId}`);
      }
      return {
        error: error.message,
        code: error.code,
        draft: typeof submittedContent === "string" ? submittedContent : undefined,
        stage: typeof submittedStage === "string" ? submittedStage : undefined,
      };
    }
    if (error instanceof TypeError) {
      return {
        error: "Koneksi terputus. Jawabanmu masih ada di form dan belum dikirim.",
        code: undefined,
        draft: typeof submittedContent === "string" ? submittedContent : undefined,
        stage: typeof submittedStage === "string" ? submittedStage : undefined,
      };
    }
    throw error;
  }
}

export function HydrateFallback() {
  return <AssignmentPageSkeleton />;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Assignment | NALAR" }];
}

export default function AssignmentRoute({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof clientAction>();
  return (
    <AssignmentPage
      data={loaderData}
      actionError={actionData?.error}
      actionCode={actionData && "code" in actionData ? actionData.code : undefined}
      actionDraft={actionData && "draft" in actionData ? actionData.draft : undefined}
      actionStage={actionData && "stage" in actionData ? actionData.stage : undefined}
    />
  );
}

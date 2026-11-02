import { redirect } from "react-router";
import { HttpError } from "~/lib/http";
import { studentApi } from "./student";
import {
  clearWritingSignals,
  writingSignalsKey,
} from "../hooks/use-writing-signals";
import { rememberEarned } from "../lib/game";
import type { WorkflowStage } from "../types";
import { assignmentDraftKey, clearActivityDraft } from "../lib/activity-drafts";

const workflowStages: WorkflowStage[] = [
  "1_independent_effort",
  "2_guided_questioning",
  "3_ai_evaluation",
  "4_revision_finalization",
  "5_reflection",
];

// The writing signal is best-effort: a missing or broken one never blocks a stage.
function writingSignalsFrom(formData: FormData) {
  const raw = formData.get("signals");
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function assignmentAction(
  request: Request,
  assignmentId: string,
  returnTo?: string,
) {
  if (!assignmentId)
    throw new Response("Assignment tidak ditemukan", { status: 404 });
  const formData = await request.formData();
  const intent = formData.get("intent");
  const submittedStage = formData.get("stage");
  const submittedContent = formData.get("content");
  try {
    if (intent === "start") {
      await studentApi.startAssignment(request, assignmentId);
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
          error:
            "Form assignment tidak valid. Muat ulang halaman lalu coba lagi.",
          code: "ASSIGNMENT_STAGE_INVALID" as const,
          draft:
            typeof submittedContent === "string" ? submittedContent : undefined,
          stage:
            typeof submittedStage === "string" ? submittedStage : undefined,
        };
      }
      const completion = await studentApi.completeStage(
        request,
        submissionId,
        submittedStage as WorkflowStage,
        submittedContent.trim() || undefined,
        writingSignalsFrom(formData),
      );
      clearWritingSignals(writingSignalsKey(submissionId, submittedStage));
      clearActivityDraft(assignmentDraftKey(submissionId, submittedStage));
      rememberEarned(assignmentId, completion.points);
      // The post lights up on the hall, where the student sees the path move on.
      const courseId = formData.get("courseId");
      if (!returnTo && typeof courseId === "string" && courseId) {
        return redirect(
          `/courses/${courseId}/balai/${assignmentId}?nyala=${submittedStage}`,
        );
      }
    } else {
      return {
        error:
          "Aksi assignment tidak dikenali. Muat ulang halaman lalu coba lagi.",
        code: "ASSIGNMENT_SUBMIT_CONFLICT" as const,
        draft:
          typeof submittedContent === "string" ? submittedContent : undefined,
        stage: typeof submittedStage === "string" ? submittedStage : undefined,
      };
    }
    return redirect(returnTo ?? `/assignments/${assignmentId}`);
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof HttpError) {
      if (
        error.code === "ASSIGNMENT_STAGE_OUT_OF_ORDER" ||
        error.code === "ASSIGNMENT_SUBMISSION_SUBMITTED"
      ) {
        return redirect(returnTo ?? `/assignments/${assignmentId}`);
      }
      return {
        error: error.message,
        code: error.code,
        draft:
          typeof submittedContent === "string" ? submittedContent : undefined,
        stage: typeof submittedStage === "string" ? submittedStage : undefined,
      };
    }
    if (error instanceof TypeError) {
      return {
        error:
          "Koneksi terputus. Jawabanmu masih ada di form dan belum dikirim.",
        code: undefined,
        draft:
          typeof submittedContent === "string" ? submittedContent : undefined,
        stage: typeof submittedStage === "string" ? submittedStage : undefined,
      };
    }
    throw error;
  }
}

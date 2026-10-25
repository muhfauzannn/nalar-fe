import { http } from "~/lib/http";
import type {
  AiTutorClassification,
  AiTutorMode,
  AiTutorSessionData,
  AiTutorTarget,
} from "../types";

export const aiTutorApi = {
  createPdfSession: (resourceId: string, signal: AbortSignal) =>
    http.post<{ token: string; model: string; expiresAt: string; resourceId: string }>(
      "/api/student/ai-tutor/pdf-sessions", { resourceId }, { signal },
    ),
  createSession: (target: AiTutorTarget, mode: AiTutorMode) =>
    http.post<AiTutorSessionData>("/api/student/ai-tutor/sessions", {
      ...target,
      mode,
    }),
  classify: (
    conversationId: string,
    input: {
      clientEventId: string;
      questionId?: string;
      content: string;
      mode: AiTutorMode;
    },
  ) =>
    http.post<AiTutorClassification>(
      `/api/student/ai-tutor/conversations/${conversationId}/classifications`,
      input,
    ),
  saveReply: (
    conversationId: string,
    input: {
      clientEventId: string;
      inReplyToEventId: string;
      questionId?: string;
      content: string;
      mode: AiTutorMode;
    },
  ) =>
    http.post<{ saved: boolean; messageId: string | null }>(
      `/api/student/ai-tutor/conversations/${conversationId}/replies`,
      input,
    ),
};

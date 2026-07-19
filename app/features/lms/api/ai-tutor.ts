import { http } from "~/lib/http";
import type {
  AiTutorClassification,
  AiTutorMode,
  AiTutorSessionData,
  AiTutorTarget,
} from "../types";

export const aiTutorApi = {
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

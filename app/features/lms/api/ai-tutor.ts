import { http } from "~/lib/http";
import { REQUESTED_TUTOR_AUDIO_FORMAT } from "../lib/tutor-audio";
import type {
  AiTutorClassification,
  AiTutorMode,
  AiTutorSessionData,
  AiTutorTarget,
} from "../types";

export const aiTutorApi = {
  createPdfSession: (resourceId: string, signal: AbortSignal) =>
    http.post<{ token: string; model: string; expiresAt: string; resourceId: string; audioFormat?: string }>(
      "/api/student/ai-tutor/pdf-sessions", { resourceId, audioFormat: REQUESTED_TUTOR_AUDIO_FORMAT }, { signal },
    ),
  createSession: (target: AiTutorTarget, mode: AiTutorMode) =>
    http.post<AiTutorSessionData>("/api/student/ai-tutor/sessions", {
      ...target,
      mode,
      audioFormat: REQUESTED_TUTOR_AUDIO_FORMAT,
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

import { http } from "~/lib/http";
import type { LiveFailureKind } from "../lib/live-session-policy";
import type {
  AiTutorClassification,
  AiTutorMode,
  AiTutorSessionData,
  AiTutorTarget,
} from "../types";

export type LiveSessionEvent = {
  surface: "pdf" | "quiz" | "assignment";
  event: "connect_failed" | "closed" | "retry_scheduled" | "renewed" | "renew_failed" | "idle_closed" | "response_timeout" | "response_recovery" | "empty_response";
  kind?: LiveFailureKind;
  phase?: "connect" | "live";
  code?: number;
  reason?: string;
  ageMs?: number;
  attempt?: number;
};

export const aiTutorApi = {
  createPdfSession: (resourceId: string, signal: AbortSignal) =>
    http.post<{ token: string; model: string; expiresAt: string; resourceId: string; maxSessionSeconds?: number }>(
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
  /** Fire-and-forget: the browser talks to Gemini directly, so only we can say what happened there. */
  reportEvent: (input: LiveSessionEvent) =>
    http
      .post<void>("/api/student/ai-tutor/session-events", input, { keepalive: true })
      .catch(() => undefined),
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

import type { BadgeProgress, EarnedPoint, ProcessPointKind, WorkflowStage } from "../types";

// What each Poin Nalar is for, in the student's words. Every one rewards how the
// work was done, never the AI Offloading Index (PRD §5.9).
export const pointCopy: Record<ProcessPointKind, { title: string; detail: string }> = {
  independent_draft: {
    title: "Draf dari pikiranmu sendiri",
    detail: "Sebagian besar draf Tahap 1 kamu ketik sendiri, bukan ditempel.",
  },
  hint_request: {
    title: "Minta petunjuk, bukan jawaban",
    detail: "Kamu meminta penjelasan atau petunjuk dari tutor.",
  },
  reflective_question: {
    title: "Pertanyaan reflektif",
    detail: "Kamu meminta tutor menguji atau mengevaluasi cara berpikirmu.",
  },
  critical_evaluation: {
    title: "Evaluasi yang kritis",
    detail: "Kamu menunjuk bagian jawaban AI yang kurang tepat atau belum lengkap.",
  },
  substantial_revision: {
    title: "Revisi yang sungguh-sungguh",
    detail: "Seperempat atau lebih dari drafmu berubah di Tahap 4.",
  },
  specific_reflection: {
    title: "Refleksi yang spesifik",
    detail: "Refleksimu menyebut hal konkret yang berubah dari drafmu.",
  },
  journey_complete: {
    title: "Lima pos menyala",
    detail: "Kamu menempuh semua tahap sampai refleksi.",
  },
};

export const badgeCopy: Record<BadgeProgress["id"], { title: string; detail: string; image: string }> = {
  penjelajah: {
    title: "Penjelajah",
    detail: "Menyalakan lima pos untuk pertama kali.",
    image: "/game/badge-penjelajah.webp",
  },
  penjelas: {
    title: "Penjelas",
    detail: "Tiga kali menunjuk kekurangan jawaban AI.",
    image: "/game/badge-penjelas.webp",
  },
  tekun: {
    title: "Tekun",
    detail: "Tiga kali merevisi drafmu secara substansial.",
    image: "/game/badge-tekun.webp",
  },
};

export const postNames: Record<WorkflowStage, string> = {
  "1_independent_effort": "Upaya mandiri",
  "2_guided_questioning": "Tanya NALAR",
  "3_ai_evaluation": "Evaluasi jawaban AI",
  "4_revision_finalization": "Revisi",
  "5_reflection": "Refleksi",
};

// Centres of the five stone pads in /game/island-journey.webp, as a share of
// its width and height, bottom (Tahap 1) to top (Tahap 5).
export const padPositions: Record<WorkflowStage, { x: number; y: number }> = {
  "1_independent_effort": { x: 0.391, y: 0.797 },
  "2_guided_questioning": { x: 0.44, y: 0.609 },
  "3_ai_evaluation": { x: 0.503, y: 0.433 },
  "4_revision_finalization": { x: 0.688, y: 0.335 },
  "5_reflection": { x: 0.679, y: 0.231 },
};

const earnedKey = (assignmentId: string) => `nalar:earned:${assignmentId}`;

// Points earned by the stage just completed, carried across the redirect once.
export function rememberEarned(assignmentId: string, points: EarnedPoint[] | undefined) {
  if (!points?.length) return;
  try {
    sessionStorage.setItem(earnedKey(assignmentId), JSON.stringify(points));
  } catch {
    // Without storage the points are still on the island page.
  }
}

export function takeEarned(assignmentId: string): EarnedPoint[] {
  try {
    const raw = sessionStorage.getItem(earnedKey(assignmentId));
    sessionStorage.removeItem(earnedKey(assignmentId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as EarnedPoint[]) : [];
  } catch {
    return [];
  }
}

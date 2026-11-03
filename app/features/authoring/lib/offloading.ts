import type { AiRelianceLevel, OffloadingLevel, PromptIntent, WorkflowStage } from "../types";

// Level names and teacher follow-ups come straight from the proposal (PRD §5.3,
// Tabel 3). The Index is reflective feedback, never a grade: the copy describes
// a pattern of AI use, not the student.
export const LEVELS: OffloadingLevel[] = [
  "1_ai_as_tool",
  "2_ai_as_scaffold",
  "3_partial_offloading",
  "4_full_offloading",
];

export const levelCopy: Record<
  OffloadingLevel,
  { name: string; range: string; pattern: string; followUp: string; swatch: string }
> = {
  "1_ai_as_tool": {
    name: "Mandiri",
    range: "0–25",
    pattern: "Menyelesaikan sebagian besar tugas sendiri; AI jadi pendamping.",
    followUp: "Pertahankan. Dorong mereka memakai AI untuk memperluas pemahaman, bukan sekadar memeriksa.",
    swatch: "bg-level-1",
  },
  "2_ai_as_scaffold": {
    name: "Terbimbing",
    range: "26–50",
    pattern: "AI dipakai untuk petunjuk dan klarifikasi; proses berpikir tetap jalan.",
    followUp: "Minta mereka mencoba lebih lama di Tahap 1 sebelum bertanya ke NALAR.",
    swatch: "bg-level-2",
  },
  "3_partial_offloading": {
    name: "Bergantung",
    range: "51–75",
    pattern: "Sebagian besar penyelesaian dipengaruhi AI; berpikir mandiri mulai berkurang.",
    followUp: "Dampingi lebih dekat: minta refleksi lisan dan pengerjaan bertahap di tugas berikutnya.",
    swatch: "bg-level-3",
  },
  "4_full_offloading": {
    name: "Sangat bergantung",
    range: "76–100",
    pattern: "Penyelesaian didominasi AI; keterlibatan berpikir mandiri rendah.",
    followUp: "Intervensi: latihan mandiri tanpa AI, batasi bantuan tutor, dan latih evaluasi jawaban.",
    swatch: "bg-level-4",
  },
};

// The quiz's lighter reflection (PRD §5.3A) has four levels of its own. The names
// are the ones the student sees, so a teacher and a student talk about the same
// thing; the swatches take the Index's one ordered ramp, light -> dark as reliance grows.
export const RELIANCE_LEVELS: AiRelianceLevel[] = ["none", "low", "moderate", "high"];

export const relianceCopy: Record<AiRelianceLevel, { name: string; pattern: string; followUp: string; swatch: string }> = {
  none: {
    name: "Tanpa AI Tutor",
    pattern: "Mengerjakan tanpa bertanya ke tutor.",
    followUp: "Tidak perlu tindak lanjut. Tutor tersedia kalau mereka butuh.",
    swatch: "bg-level-1",
  },
  low: {
    name: "Pemakaian sehat",
    pattern: "Bertanya untuk petunjuk dan klarifikasi, lalu mengerjakan sendiri.",
    followUp: "Pertahankan. Ajak mereka menjelaskan jawaban dengan kata sendiri.",
    swatch: "bg-level-2",
  },
  moderate: {
    name: "Campuran",
    pattern: "Sebagian pertanyaan meminta petunjuk, sebagian meminta jawaban.",
    followUp: "Ingatkan mencoba soal dulu sebelum bertanya, dan minta petunjuk, bukan jawaban.",
    swatch: "bg-level-3",
  },
  high: {
    name: "Cenderung meminta jawaban",
    pattern: "Sebagian besar pertanyaan meminta jawaban jadi.",
    followUp: "Bicara satu per satu. Latih soal serupa tanpa tutor lalu bahas langkahnya.",
    swatch: "bg-level-4",
  },
};

export const stageCopy: Record<WorkflowStage, { short: string; name: string }> = {
  "1_independent_effort": { short: "1", name: "Upaya mandiri" },
  "2_guided_questioning": { short: "2", name: "Tanya NALAR" },
  "3_ai_evaluation": { short: "3", name: "Evaluasi jawaban AI" },
  "4_revision_finalization": { short: "4", name: "Revisi" },
  "5_reflection": { short: "5", name: "Refleksi" },
};

export const intentCopy: Record<PromptIntent, string> = {
  direct_answer: "Minta jawaban jadi",
  explanation_hint: "Minta petunjuk",
  reflective_evaluative: "Reflektif",
};

// Factor codes the analysis writes today (see ai-analysis.service); anything
// else falls back to the code made readable.
const factorNames: Record<string, string> = {
  upaya_mandiri: "Upaya mandiri",
  intensi_prompt: "Cara bertanya ke AI",
  kedalaman_revisi: "Kedalaman revisi",
  kualitas_refleksi: "Kualitas refleksi",
  evaluasi_jawaban_ai: "Evaluasi jawaban AI",
};

export function humanizeFactor(factor: string) {
  if (factorNames[factor]) return factorNames[factor];
  const label = factor.replace(/[_-]+/g, " ").trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

import type { AssignmentAnalytics } from "../types";

export type Student = AssignmentAnalytics["students"][number];
export type Journey = NonNullable<Student["journey"]>;
export type Traveller = Student & { journey: Journey };

// The three steps of the class flow, in the order a student meets them.
export const STEPS = [
  { key: "draft", title: "Draf awal", options: { strong: "Draf kuat", thin: "Draf tipis" } },
  { key: "asked", title: "Bertanya ke NALAR", options: { probing: "Menguji", hints: "Minta petunjuk", none: "Tidak bertanya", answers: "Minta jawaban" } },
  { key: "revision", title: "Revisi", options: { deep: "Revisi berisi", light: "Revisi tipis", pasted: "Ditempel" } },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
export type FlowNode = { step: StepKey; value: string; label: string; students: Traveller[] };
export type FlowLink = { from: FlowNode; to: FlowNode; students: Traveller[] };

const label = (step: (typeof STEPS)[number], value: string) => (step.options as Record<string, string>)[value]!;

/** The moves worth a teacher's eye are the ones toward asking for answers and pasting. */
export const isConcern = (value: string) => value === "answers" || value === "pasted";

export const travellers = (students: Student[]) => students.filter((student): student is Traveller => Boolean(student.journey));

export function flowOf(students: Traveller[]) {
  const columns = STEPS.map((step) =>
    Object.keys(step.options)
      .map((value): FlowNode => ({ step: step.key, value, label: label(step, value), students: students.filter((student) => student.journey[step.key] === value) }))
      .filter((node) => node.students.length > 0),
  );
  const links = columns.slice(0, -1).flatMap((column, index) =>
    column.flatMap((from) =>
      columns[index + 1]!.flatMap((to): FlowLink[] => {
        const shared = from.students.filter((student) => to.students.includes(student));
        return shared.length ? [{ from, to, students: shared }] : [];
      }),
    ),
  );
  return { columns, links };
}

/** Whole routes through the three steps, the most travelled first. */
export function routesOf(students: Traveller[]) {
  const routes = new Map<string, { steps: string[]; concern: boolean; students: Traveller[] }>();
  for (const student of students) {
    const values = STEPS.map((step) => student.journey[step.key] as string);
    const key = values.join(">");
    const route = routes.get(key) ?? { steps: STEPS.map((step, index) => label(step, values[index]!)), concern: values.some(isConcern), students: [] };
    route.students.push(student);
    routes.set(key, route);
  }
  return [...routes.values()].sort((a, b) => b.students.length - a.students.length);
}

export const needsTalk = (journey: Journey, rules: AssignmentAnalytics["journeyRules"]) =>
  journey.draftWords < rules.strongDraftWords && journey.ownChange < rules.deepRevisionPercent;

/** The evidence behind a student's place on the charts, in one line. */
export function evidenceOf({ draftWords, prompts, pastedPercent, ownChange }: Journey) {
  const asked = prompts.direct + prompts.hint + prompts.reflective;
  return [
    `Draf ${draftWords} kata`,
    asked === 0 ? "tidak bertanya" : prompts.direct ? `${prompts.direct} dari ${asked} pertanyaan minta jawaban` : `${asked} pertanyaan, tanpa minta jawaban`,
    pastedPercent ? `${pastedPercent}% jawaban akhir ditempel` : `${ownChange}% berubah oleh dirinya`,
  ].join(" · ");
}

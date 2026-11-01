import type { ComponentType } from "react";

import { InclinedPlaneLab } from "./inclined-plane-lab";

// The labs Bernalar ships (PRD §5.10). Keys and challenge ids must match the
// server's catalog in nalar-be/src/modules/labs/lab-catalog.ts.
export type LabProps = { solved: string[]; onSolve: (challenge: string) => Promise<number> };

export const LABS: Record<string, { title: string; subject: string; challenges: number; Component: ComponentType<LabProps> }> = {
  "bidang-miring": {
    title: "Bidang miring",
    subject: "Fisika",
    challenges: 3,
    Component: InclinedPlaneLab as ComponentType<LabProps>,
  },
};

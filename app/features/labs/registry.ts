import type { ComponentType } from "react";

import { InclinedPlaneLab } from "./inclined-plane-lab";
import { LajuLab } from "./laju-lab";
import { OsmosisLab } from "./osmosis-lab";
import { ParabolaLab } from "./parabola-lab";
import { SinusLab } from "./sinus-lab";

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
  "gerak-parabola": {
    title: "Gerak parabola",
    subject: "Fisika",
    challenges: 3,
    Component: ParabolaLab as ComponentType<LabProps>,
  },
  "mesin-gelombang": {
    title: "Mesin gelombang",
    subject: "Matematika",
    challenges: 3,
    Component: SinusLab as ComponentType<LabProps>,
  },
  "reaktor-tumbukan": {
    title: "Reaktor tumbukan",
    subject: "Kimia",
    challenges: 3,
    Component: LajuLab as ComponentType<LabProps>,
  },
  "mikroskop-osmosis": {
    title: "Mikroskop osmosis",
    subject: "Biologi",
    challenges: 3,
    Component: OsmosisLab as ComponentType<LabProps>,
  },
};

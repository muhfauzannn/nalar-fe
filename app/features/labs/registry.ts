import type { ComponentType } from "react";

import { LajuLab } from "./laju-lab";
import { OsmosisLab } from "./osmosis-lab";
import { ParabolaLab } from "./parabola-lab";
import { SinusLab } from "./sinus-lab";

// The labs Bernalar ships (PRD §5.10). Keys and challenge ids must match the
// server's catalog in nalar-be/src/modules/labs/lab-catalog.ts.
export type LabProps = {
  solved: string[];
  onSolve: (challenge: string) => Promise<number>;
  /** The lab's state in one line, for the AI tutor beside it. */
  onState?: (summary: string) => void;
};

// `parts` are the `data-lab-part` ids in a lab's markup: what its tutor may point at (see
// pointer.ts). They must match the server's brief in
// nalar-be/src/modules/ai-tutor/lab-tutor.config.ts.
export const LABS: Record<
  string,
  { title: string; subject: string; challenges: number; parts: readonly string[]; Component: ComponentType<LabProps> }
> = {
  "gerak-parabola": {
    title: "Gerak parabola",
    subject: "Fisika",
    challenges: 3,
    parts: ["laras", "mesiu", "bola", "bendera", "kereta", "tembak"],
    Component: ParabolaLab as ComponentType<LabProps>,
  },
  "mesin-gelombang": {
    title: "Mesin gelombang",
    subject: "Matematika",
    challenges: 3,
    parts: ["engkol", "pasak", "roda-gigi", "grafik", "pena", "tombol"],
    Component: SinusLab as ComponentType<LabProps>,
  },
  "reaktor-tumbukan": {
    title: "Reaktor tumbukan",
    subject: "Kimia",
    challenges: 3,
    parts: ["pemanas", "pompa", "katalis", "pengukur", "reaksikan"],
    Component: LajuLab as ComponentType<LabProps>,
  },
  "mikroskop-osmosis": {
    title: "Mikroskop osmosis",
    subject: "Biologi",
    challenges: 3,
    parts: ["pipet", "lensa", "teteskan"],
    Component: OsmosisLab as ComponentType<LabProps>,
  },
};

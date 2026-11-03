// Lab "Mesin gelombang" (Matematika SMA, fungsi trigonometri). A crank turns a
// wheel through a 1× or 2× gear; a peg on the wheel sits A units from the hub.
// The peg's height is A·sin(b·θ), and a pen on the graph board is always level
// with it, so turning the crank draws y = A sin(bθ) against the crank angle θ.

export type Gear = 1 | 2;
export const AMPLITUDE = { min: 0.5, max: 2 } as const;
export const TURN = 360;

const rad = (degrees: number) => (degrees * Math.PI) / 180;

export const heightOf = (theta: number, amplitude: number, gear: Gear) => amplitude * Math.sin(rad(gear * theta));

/** θ in radians as a fraction of π where it is a common one (5π/6), else a decimal (0,83π). */
export function radianText(theta: number) {
  const turns = theta / 180;
  if (Math.abs(turns) < 1e-6) return "0";
  for (const den of [1, 2, 3, 4, 6]) {
    const num = Math.round(turns * den);
    if (Math.abs(num / den - turns) < 0.004) {
      const g = gcd(num, den);
      const n = num / g;
      const d = den / g;
      const top = n === 1 ? "π" : `${n}π`;
      return d === 1 ? top : `${top}/${d}`;
    }
  }
  return `${turns.toFixed(2).replace(".", ",")}π`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

// ---- the three missions ----------------------------------------------------------------------

export type ChallengeId = "dua-sudut-setengah" | "periode-dua-kali" | "tiru-gelombang";

export type Challenge = {
  id: ChallengeId;
  story: string;
  lock?: { amplitude?: number; gear?: Gear };
  /** Mission 1 and 2 are answered by marking the graph; mission 3 by matching a wave. */
  marks: boolean;
};

export const CHALLENGES: Challenge[] = [
  { id: "dua-sudut-setengah", story: "Putar engkol dan tandai SEMUA sudut saat pena tepat di garis y = 0,5.", lock: { amplitude: 1, gear: 1 }, marks: true },
  { id: "periode-dua-kali", story: "Roda gigi 2×. Tandai putaran engkol terkecil saat gelombang mulai berulang.", lock: { amplitude: 1, gear: 2 }, marks: true },
  { id: "tiru-gelombang", story: "Tiru gelombang ungu: atur jarak pasak dan roda giginya, lalu putar penuh.", marks: false },
];

export const TARGET_WAVE = { amplitude: 1.5, gear: 2 as Gear };

/** Mission 1: marks where the pen is on y = 0.5, at least two different angles. */
export function halfMarks(marks: number[]) {
  const on = marks.filter((theta) => Math.abs(Math.sin(rad(theta)) - 0.5) <= 0.03);
  const distinct: number[] = [];
  for (const theta of on) if (distinct.every((other) => Math.abs(other - theta) > 40)) distinct.push(theta);
  return distinct;
}

/** Mission 2: the first repeat of sin(2θ) is at θ = 180° (π). */
export const isPeriodMark = (theta: number) => Math.abs(theta - 180) <= 4;

/** Mission 3: the wave matches the target once the whole turn is drawn. */
export const matchesTarget = (amplitude: number, gear: Gear, drawnTo: number) =>
  Math.abs(amplitude - TARGET_WAVE.amplitude) <= 0.05 && gear === TARGET_WAVE.gear && drawnTo >= TURN - 2;

export const fmt = (value: number, digits = 2) => (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits).replace(".", ",");

// Lab "Gerak parabola" (Fisika SMA, kinematika 2D). A cannon on a cliff fires a
// ball over a field. No air resistance: the horizontal speed never changes, the
// vertical speed changes by g every second, and the ball's mass does not enter
// at all. Every number the lab shows, every frame of the flight and every
// challenge check come from this module.

export const G = 9.8;
/** Height of the cliff top above the field (m). */
export const CLIFF = 6;
/** The barrel turns about a trunnion this high above the cliff top (m). */
export const TRUNNION = 1.1;
/** Where the trunnion sits, measured from the cliff edge (m, negative = inland). */
export const TRUNNION_X = -2.6;
export const BARREL = 2.4;
/** The field ends here (m from the cliff edge); a ball beyond it is lost. */
export const FIELD = 40;

export const ANGLE = { min: 10, max: 80 } as const;
export const SPEED = { min: 8, max: 22 } as const;
export type Mass = 1 | 5;
export const BALL_RADIUS: Record<Mass, number> = { 1: 0.32, 5: 0.55 };

export type Shot = { angle: number; speed: number; mass: Mass };

const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** The muzzle: where the ball leaves the barrel. */
export function muzzleOf(angle: number) {
  return {
    x: TRUNNION_X + BARREL * Math.cos(rad(angle)),
    y: CLIFF + TRUNNION + BARREL * Math.sin(rad(angle)),
  };
}

export function flightOf({ angle, speed }: Shot) {
  const start = muzzleOf(angle);
  const vx = speed * Math.cos(rad(angle));
  const vy = speed * Math.sin(rad(angle));
  // y(t) = y0 + vy t - g t²/2 = 0 on the field
  const time = (vy + Math.sqrt(vy * vy + 2 * G * start.y)) / G;
  const range = start.x + vx * time;
  const apexTime = vy / G;
  return {
    start,
    vx,
    vy,
    time,
    range,
    apex: { x: start.x + vx * apexTime, y: start.y + (vy * vy) / (2 * G), time: apexTime },
    lost: range > FIELD,
  };
}

export function positionAt(shot: Shot, t: number) {
  const f = flightOf(shot);
  const time = Math.min(Math.max(t, 0), f.time);
  return {
    x: f.start.x + f.vx * time,
    y: Math.max(0, f.start.y + f.vy * time - (G * time * time) / 2),
    vx: f.vx,
    vy: f.vy - G * time,
    time,
  };
}

/** Points of the path, for drawing the trace. */
export function pathOf(shot: Shot, upTo = Infinity, steps = 60) {
  const f = flightOf(shot);
  const end = Math.min(upTo, f.time);
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const p = positionAt(shot, (end * i) / steps);
    points.push({ x: p.x, y: p.y });
  }
  return points;
}

// ---- the three missions ----------------------------------------------------------------------

export type ChallengeId = "kenai-benteng" | "dua-sudut" | "berat-ringan";

export type Challenge = {
  id: ChallengeId;
  /** One line of story, shown as the mission card. */
  story: string;
  /** Where the target flag stands (m from the cliff edge). */
  target: number;
  /** Controls fixed by the mission. */
  lock?: Partial<Shot>;
};

export const TARGET_HALF_WIDTH = 1;

export const CHALLENGES: Challenge[] = [
  { id: "kenai-benteng", story: "Kirim bola tepat ke bendera benteng, 30 m dari tebing.", target: 30 },
  { id: "dua-sudut", story: "Bendera 24 m. Kenai dua kali dengan dua sudut yang berbeda jauh.", target: 24 },
  { id: "berat-ringan", story: "Sudut dan mesiu dikunci. Tebak dulu: bola 5 kg atau 1 kg yang lebih jauh?", target: 33, lock: { angle: 40, speed: 16 } },
];

export const hits = (shot: Shot, target: number) => {
  const f = flightOf(shot);
  return !f.lost && Math.abs(f.range - target) <= TARGET_HALF_WIDTH;
};

/** Mission 2 is done by two hits whose angles differ by this much. */
export const TWO_ANGLES_APART = 15;

/** The other angle that lands on the same spot at the same speed, if there is one. */
export function partnerAngle(shot: Shot) {
  const want = flightOf(shot).range;
  let best: number | null = null;
  for (let a = ANGLE.min; a <= ANGLE.max; a += 0.1) {
    if (Math.abs(a - shot.angle) < TWO_ANGLES_APART) continue;
    const r = flightOf({ ...shot, angle: a }).range;
    if (Math.abs(r - want) < 0.25 && (best === null || Math.abs(r - want) < Math.abs(flightOf({ ...shot, angle: best }).range - want))) best = a;
  }
  return best === null ? null : Math.round(best);
}

/** A short nudge after a miss: how far off, and which way. */
export function missHint(shot: Shot, target: number) {
  const f = flightOf(shot);
  if (f.lost) return { text: "Terlalu jauh, keluar lapangan", short: false };
  const off = f.range - target;
  const metres = Math.abs(off).toFixed(1).replace(".", ",");
  return { text: off < 0 ? `Kurang ${metres} m` : `Lebih ${metres} m`, short: off < 0 };
}

export const fmt = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",");

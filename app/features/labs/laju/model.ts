// Lab "Reaktor tumbukan" (Kimia SMA, laju reaksi dan teori tumbukan). A glass
// reactor of A and B on a hot plate. The rate is r = k·[A] with the Arrhenius
// k = A·exp(−Ea/RT): Ea is chosen so 10 K more doubles the rate around room
// temperature, and the catalyst lowers Ea (a different path), so it speeds the
// reaction up without being used up. Rates are shown relative to the standard
// mix: 300 K, 1,0 M, no catalyst.

export const R = 8.314;
/** Activation energy without and with the catalyst (J/mol). */
export const EA = 53_600;
export const EA_CATALYST = 48_400;
export const TEMP = { min: 290, max: 340, step: 5 } as const;
export const CONC = { min: 0.5, max: 2, step: 0.25 } as const;
export const CATALYST_MASS = 2.0;
/** The reactor's glass is rated to this temperature in mission 3. */
export const SAFE_TEMP = 310;

export type Mix = { temp: number; conc: number; catalyst: boolean };
export const STANDARD: Mix = { temp: 300, conc: 1, catalyst: false };

const kOf = (temp: number, catalyst: boolean) => Math.exp(-(catalyst ? EA_CATALYST : EA) / (R * temp));

/** Rate relative to the standard mix. */
export const rateOf = (mix: Mix) => (kOf(mix.temp, mix.catalyst) * mix.conc) / (kOf(STANDARD.temp, false) * STANDARD.conc);

/** The share of collisions with at least Ea of energy, exp(−Ea/RT), shown as "1 in N". */
export const effectiveShare = (mix: Mix) => Math.exp(-(mix.catalyst ? EA_CATALYST : EA) / (R * mix.temp));

/** How often particles meet, relative to the standard: ∝ [A]·[B]·√T, with [B] = [A]. */
export const collisionsOf = (mix: Mix) => mix.conc * mix.conc * Math.sqrt(mix.temp / STANDARD.temp);

/** Mean particle speed relative to the standard (∝ √T). */
export const speedOf = (temp: number) => Math.sqrt(temp / STANDARD.temp);

// ---- the three missions ----------------------------------------------------------------------

export type ChallengeId = "gandakan-suhu" | "katalis-tetap" | "cepat-tapi-aman";

export type Challenge = {
  id: ChallengeId;
  story: string;
  lock?: Partial<Mix>;
  /** Mission 2 asks for a prediction before the reaction may run. */
  predict?: boolean;
};

export const CHALLENGES: Challenge[] = [
  { id: "gandakan-suhu", story: "Buat reaksi 2× lebih cepat, hanya dengan memutar pemanas.", lock: { conc: 1, catalyst: false } },
  { id: "katalis-tetap", story: "Tebak dulu: setelah reaksi, katalis 2,0 g itu habis atau tetap?", lock: { temp: 300, conc: 1, catalyst: true }, predict: true },
  { id: "cepat-tapi-aman", story: "Capai laju 12× atau lebih, tapi kaca reaktor hanya tahan 310 K." },
];

export const DOUBLE_BAND = { min: 1.9, max: 2.1 } as const;
export const FAST_TARGET = 12;

export type Verdict = { ok: boolean; text: string };

export function judge(id: ChallengeId, mix: Mix): Verdict {
  const rate = rateOf(mix);
  if (id === "gandakan-suhu") {
    if (rate >= DOUBLE_BAND.min && rate <= DOUBLE_BAND.max) return { ok: true, text: `${mix.temp} K: naik 10 K, laju 2×` };
    return { ok: false, text: rate < DOUBLE_BAND.min ? `Baru ${fmt(rate)}×, kurang panas` : `${fmt(rate)}×, terlalu panas` };
  }
  if (id === "katalis-tetap") return { ok: true, text: `Laju ${fmt(rate)}×, katalis tetap ${fmt(CATALYST_MASS)} g` };
  if (mix.temp > SAFE_TEMP) return { ok: false, text: `${mix.temp} K, kaca bisa retak! Maks ${SAFE_TEMP} K` };
  if (rate >= FAST_TARGET) return { ok: true, text: `${fmt(rate)}× di ${mix.temp} K: katalis membuka jalan pintas` };
  return { ok: false, text: `Baru ${fmt(rate)}×${mix.catalyst ? "" : ", panas saja tidak cukup"}` };
}

export const fmt = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",");

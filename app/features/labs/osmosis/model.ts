// Lab "Mikroskop osmosis" (Biologi SMA, transpor membran). A cell on a slide in
// a drop of salt solution. Water crosses the membrane toward the saltier side,
// so the cell's volume settles where inside and outside are equally salty
// (Boyle–van 't Hoff): V/V₀ = b + (1 − b)·C_iso / C_out, with b the share of the
// cell that is not water. A red blood cell has no wall, so in dilute solution it
// swells until it bursts; a plant cell's wall stops it swelling (turgor), and in
// salty solution its membrane pulls away from the wall (plasmolysis).

export type CellKind = "darah" | "bawang";
export const SALT = { min: 0, max: 3, step: 0.05 } as const;

export const CELLS: Record<CellKind, { iso: number; solid: number }> = {
  // a red blood cell is isotonic with 0,9 % NaCl
  darah: { iso: 0.9, solid: 0.4 },
  // red onion epidermis, isotonic near 1,0 %
  bawang: { iso: 1.0, solid: 0.3 },
};

/** A red blood cell bursts (hemolysis) beyond this volume; it crenates below CRENATE. */
export const BURST = 1.6;
export const CRENATE = 0.9;
export const SWELL = 1.1;
/** A plant protoplast is visibly pulled off its wall below this volume. */
export const PLASMOLYSIS = 0.8;
/** The wall lets a plant cell swell only this much. */
export const WALL = 1.04;

/** The volume the cell settles at, relative to its volume in an isotonic drop. */
export function volumeOf(kind: CellKind, salt: number) {
  const { iso, solid } = CELLS[kind];
  const free = salt <= 0 ? Infinity : solid + ((1 - solid) * iso) / salt;
  return kind === "bawang" ? Math.min(WALL, free) : free;
}

export type State = "pecah" | "menggembung" | "normal" | "mengkerut" | "turgid" | "plasmolisis";
export function stateOf(kind: CellKind, volume: number): State {
  if (kind === "bawang") return volume < PLASMOLYSIS ? "plasmolisis" : volume >= 1 ? "turgid" : "normal";
  if (volume >= BURST) return "pecah";
  if (volume >= SWELL) return "menggembung";
  if (volume <= CRENATE) return "mengkerut";
  return "normal";
}

/** Where water goes: into the cell (+1), out (−1), or no net flow (0). */
export function flowOf(kind: CellKind, salt: number) {
  const { iso } = CELLS[kind];
  if (Math.abs(salt - iso) < 0.05) return 0;
  return salt < iso ? 1 : -1;
}

// ---- the three missions ----------------------------------------------------------------------

export type ChallengeId = "air-ke-mana" | "cari-isotonis" | "plasmolisis";
export type Guess = "masuk" | "keluar" | "diam";

/** `start` is where the dropper's ring begins, away from the answer. */
export type Challenge = { id: ChallengeId; story: string; cell: CellKind; start: number; lock?: number; predict?: boolean };

export const CHALLENGES: Challenge[] = [
  { id: "air-ke-mana", story: "Sel darah merah ditetesi air suling. Tebak dulu: air bergerak ke mana?", cell: "darah", start: 0, lock: 0, predict: true },
  { id: "cari-isotonis", story: "Cari kadar garam yang membuat sel darah tetap utuh dan tidak berubah.", cell: "darah", start: 0.3 },
  { id: "plasmolisis", story: "Sel bawang merah: buat membrannya lepas dari dinding sel.", cell: "bawang", start: 0.5 },
];

export const ISO_BAND = 0.05;

export type Verdict = { ok: boolean; text: string };
export function judge(id: ChallengeId, salt: number, guess: Guess | null): Verdict {
  if (id === "air-ke-mana") {
    return guess === "masuk" ? { ok: true, text: "Benar: air masuk, sel menggembung lalu pecah" } : { ok: true, text: "Ternyata air masuk: sel menggembung lalu pecah" };
  }
  if (id === "cari-isotonis") {
    const off = salt - CELLS.darah.iso;
    if (Math.abs(off) <= ISO_BAND + 1e-9) return { ok: true, text: `${fmt(salt, 2)} %: isotonis, air masuk = air keluar` };
    const state = stateOf("darah", volumeOf("darah", salt));
    return { ok: false, text: off < 0 ? (state === "pecah" ? "Sel pecah: terlalu encer" : "Sel menggembung: air masuk") : "Sel mengkerut: air keluar" };
  }
  const v = volumeOf("bawang", salt);
  if (v < PLASMOLYSIS) return { ok: true, text: `${fmt(salt, 2)} %: air keluar, membran lepas dari dinding` };
  if (v >= 1) return { ok: false, text: "Sel turgid: dinding menahan sel tidak pecah" };
  return { ok: false, text: "Membran baru sedikit menjauh, tambah garam" };
}

export const fmt = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",");

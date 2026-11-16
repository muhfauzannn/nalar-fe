// "Rakit lab": the teacher describes a tool or drops a photo and the workshop appears to build a lab for it.
// For now nothing is generated. The request is matched against the labs Bernalar already ships: by Gemini on
// the server (POST /api/manage/labs/match, which also reads photos), or, when that is unreachable, by the words
// a teacher would use for each lab (its tools, its concepts, its story) listed here. A new lab joins by adding
// an entry here and in the server's catalog.
import { http } from "~/lib/http";

export type LabRecipe = {
  /** The parts the workshop "assembles", in order, shown while it crafts. */
  parts: string[];
  /** Words that point at this lab: tools first, then concepts and topics. Lower case, no accents. */
  words: string[];
};

export const RECIPES: Record<string, LabRecipe> = {
  "gerak-parabola": {
    parts: ["Laras meriam", "Tong mesiu", "Bola besi", "Bendera sasaran"],
    words: [
      "meriam", "laras", "mesiu", "bola", "peluru", "bendera", "ketapel", "lempar", "tembak", "proyektil", "lontar",
      "parabola", "gerak parabola", "sudut elevasi", "elevasi", "jarak tempuh", "kecepatan awal", "gravitasi",
      "kinematika", "lintasan", "balistik", "benteng", "fisika", "basket", "tendang",
    ],
  },
  "mesin-gelombang": {
    parts: ["Engkol", "Roda gigi", "Pasak", "Pena grafik"],
    words: [
      "engkol", "roda gigi", "gir", "pasak", "pena", "grafik", "mesin", "pasang surut", "pasang", "laut", "ombak",
      "sinus", "cosinus", "kosinus", "trigonometri", "gelombang", "periode", "amplitudo", "sudut", "lingkaran satuan",
      "derajat", "radian", "fungsi periodik", "matematika", "osilasi", "putaran",
    ],
  },
  "reaktor-tumbukan": {
    parts: ["Tabung reaktor", "Pemanas", "Pompa tekanan", "Katalis"],
    words: [
      "reaktor", "pemanas", "pompa", "katalis", "tabung", "kenop", "pengukur", "termometer", "kompor", "pabrik",
      "laju reaksi", "reaksi", "tumbukan", "teori tumbukan", "suhu", "konsentrasi", "energi aktivasi", "partikel",
      "kimia", "kinetika", "tekanan", "gas", "molekul",
    ],
  },
  "mikroskop-osmosis": {
    parts: ["Mikroskop", "Pipet", "Kaca preparat", "Sel darah"],
    words: [
      "mikroskop", "pipet", "lensa", "kaca preparat", "preparat", "infus", "tetes", "klinik", "sel", "sel darah",
      "darah", "membran", "osmosis", "difusi", "hipertonik", "hipotonik", "isotonik", "isotonis", "plasmolisis",
      "garam", "larutan", "air suling", "biologi", "konsentrasi garam",
    ],
  },
};

/** `reason` is Gemini's one line on why the lab fits; local matches carry the words they matched in `hits`. */
export type CraftMatch = { key: string; score: number; hits: string[]; reason?: string };

export type CraftAnswer = { matches: CraftMatch[]; seen: string };

/**
 * Asks the server which labs fit a description or a photo. Falls back to the local word list when the
 * server cannot answer (no network, Gemini down), so the workshop always comes back with something honest.
 */
export async function askWorkshop(request: { text: string } | { file: File }, keys: string[]): Promise<CraftAnswer> {
  try {
    const body = "text" in request ? { text: request.text, keys } : { image: await shrink(request.file), keys };
    const answer = await http.post<{ seen: string; matches: Array<{ key: string; reason: string }> }>("/api/manage/labs/match", body);
    return {
      seen: answer.seen,
      matches: answer.matches.map((match, index) => ({ key: match.key, score: 1 / (index + 1), hits: [], reason: match.reason })),
    };
  } catch (error) {
    console.warn("Bengkel lab: pencocokan server gagal, memakai daftar kata lokal", error);
    const matches = "text" in request ? matchText(request.text, keys) : await matchImage(request.file, keys);
    return { matches, seen: "" };
  }
}

/** A photo as a JPEG at most 768px on its long side, base64, small enough to send in a JSON body. */
async function shrink(file: File): Promise<{ mimeType: "image/jpeg"; data: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  // a transparent PNG would turn black as JPEG: lay it on white first
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.82);
  return { mimeType: "image/jpeg", data: url.slice(url.indexOf(",") + 1) };
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** A word hits when it appears whole, or when a typed word of 4+ letters starts it ("osmo" finds "osmosis"). */
function hitsOf(query: string, words: string[]): string[] {
  const text = ` ${normalize(query)} `;
  const typed = text.split(" ").filter((word) => word.length >= 4);
  return words.filter((word) => text.includes(` ${word} `) || typed.some((part) => word.split(" ").some((w) => w.startsWith(part))));
}

/** Labs ranked for a description; empty when nothing fits. Multi-word hits and tools weigh more than topics. */
export function matchText(query: string, keys: string[]): CraftMatch[] {
  return keys
    .flatMap((key) => {
      const recipe = RECIPES[key];
      if (!recipe) return [];
      const found = hitsOf(query, recipe.words);
      // "sel" adds nothing next to "sel darah"
      const hits = found.filter((word) => !found.some((other) => other !== word && ` ${other} `.includes(` ${word} `)));
      const score = hits.reduce((sum, word) => sum + (word.includes(" ") ? 2 : 1) + (recipe.words.indexOf(word) < 10 ? 0.5 : 0), 0);
      return score > 0 ? [{ key, score, hits }] : [];
    })
    .sort((a, b) => b.score - a.score);
}

/** How sure the workshop sounds about a match, as a percentage for the card. */
export function confidence(match: CraftMatch | undefined, best: number): number {
  if (!match || best <= 0) return 0;
  return Math.round(Math.min(97, 62 + (match.score / best) * 22 + Math.min(match.hits.length, 4) * 3));
}

/**
 * Offline fallback for a photo: read by its file name, plus its dominant colour as a tie-breaker so the same
 * photo always lands on the same lab. Only used when the server's recognition cannot be reached.
 */
export async function matchImage(file: File, keys: string[]): Promise<CraftMatch[]> {
  const byName = matchText(file.name.replace(/\.[a-z0-9]+$/i, ""), keys);
  if (byName.length) return byName;
  const hue = await dominantHue(file).catch(() => null);
  // warm photos lean to the reactor, green to biology, blue to the tide machine, the rest to the cannon
  const lean = hue === null ? "gerak-parabola" : hue < 50 || hue > 330 ? "reaktor-tumbukan" : hue < 170 ? "mikroskop-osmosis" : hue < 260 ? "mesin-gelombang" : "gerak-parabola";
  const order = [lean, ...keys.filter((key) => key !== lean)].filter((key) => keys.includes(key));
  return order.map((key, index) => ({ key, score: 1 / (index + 1), hits: [] }));
}

async function dominantHue(file: File): Promise<number | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 24;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, 24, 24);
  const { data } = ctx.getImageData(0, 0, 24, 24);
  let [x, y, weight] = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
    const [max, min] = [Math.max(r, g, b), Math.min(r, g, b)];
    const chroma = max - min;
    if (chroma < 0.12) continue;
    const h = max === r ? ((g - b) / chroma + 6) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
    const angle = (h * 60 * Math.PI) / 180;
    x += Math.cos(angle) * chroma;
    y += Math.sin(angle) * chroma;
    weight += chroma;
  }
  if (!weight) return null;
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Ideas under the search box, one per lab, so a teacher sees what kind of words work. */
export const IDEAS = ["meriam & sudut tembak", "mikroskop sel darah", "laju reaksi & suhu", "grafik sinus pasang laut"];

import { expect, test } from "@playwright/test";
import { SpokenCues, speechWords } from "../app/features/lms/lib/spoken-cues";

test("case, accents and punctuation never decide a match", () => {
  expect(speechWords("Nah, \"Pembilang\"—itu 3/4!")).toBe("nah pembilang itu 3 4");
  expect(speechWords("Café")).toBe("cafe");
});

test("each step is released by its own words, placed on the audio they arrived with", () => {
  const cues = new SpokenCues(["a disebut pembilang", "b disebut penyebut"]);
  expect(cues.revealed).toBe(0);
  expect(cues.hear("Nah, kalau di pecahan a per b, si ", 0, 2)).toEqual([]);
  // The words open the second piece, which covered audio 2..4 s.
  const [first] = cues.hear("a disebut pembilang yang artinya", 2, 4);
  expect(first.revealed).toBe(1);
  expect(first.at!).toBeGreaterThanOrEqual(2);
  expect(first.at!).toBeLessThan(2.2);
  const [second] = cues.hear(" bagian dipilih. Terus, si b disebut penyebut.", 4, 7);
  expect(second.revealed).toBe(2);
  expect(second.at!).toBeGreaterThan(5);
  expect(second.at!).toBeLessThan(6.5);
  expect(cues.done).toBe(true);
});

test("a transcript that runs ahead of its audio does not move the pointer early", () => {
  const cues = new SpokenCues(["huruf a disebut", "sedangkan huruf b"]);
  // The whole sentence arrives before any of its audio has.
  const releases = cues.hear("Huruf a disebut pembilang, artinya bagian yang kamu pilih. Sedangkan huruf b disebut penyebut.", 0, 0);
  expect(releases.map((release) => release.revealed)).toEqual([1, 2]);
  expect(releases[0].at).toBe(0);
  // About 60 characters of speech come first: roughly four seconds, not zero.
  expect(releases[1].at!).toBeGreaterThan(3.5);
});

test("words split across transcript pieces still match, but not half a word", () => {
  const cues = new SpokenCues(["huruf bawah"]);
  expect(cues.hear("Lalu huruf ba", 0, 1)).toEqual([]);
  expect(cues.hear("wah itu penyebut", 1, 2)[0].revealed).toBe(1);
  const partial = new SpokenCues(["pembilang"]);
  expect(partial.hear("Ini pembi", null, null)).toEqual([]);
  expect(partial.hear("lang", null, null)).toEqual([{ revealed: 1, at: null }]);
});

test("a phrase spoken with a different last word still counts", () => {
  const cues = new SpokenCues(["contoh tiga per empat"]);
  expect(cues.hear("Contoh tiga perempat itu artinya", null, null)).toEqual([]);
  const relaxed = new SpokenCues(["contoh tiga perempat itu"]);
  expect(relaxed.hear("Contoh tiga perempat ini artinya", null, null)[0].revealed).toBe(1);
});

test("a skipped step is passed over when a later one is heard, and steps without words follow", () => {
  const cues = new SpokenCues([undefined, "langkah satu", undefined, "langkah dua", "langkah tiga"]);
  // A leading step without words shows right away; a wordless step joins the one before it.
  expect(cues.revealed).toBe(1);
  expect(cues.hear("Kita mulai dari langkah satu.", null, null)).toEqual([{ revealed: 3, at: null }]);
  expect(cues.hear(" Lalu langsung langkah tiga.", null, null)).toEqual([{ revealed: 5, at: null }]);
  expect(cues.done).toBe(true);
});

test("words reused much later do not jump over several steps", () => {
  const cues = new SpokenCues(["satu", "dua", "tiga", "empat"]);
  expect(cues.hear("Ada empat hal.", null, null)).toEqual([]);
  expect(cues.revealed).toBe(0);
});

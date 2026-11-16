import { expect, test } from "@playwright/test";
import { TutorAudioProgressGuard, tidyTutorTranscript } from "../app/features/lms/lib/tutor-audio";

test("cuts an elongated greeting after transcript progress stops", () => {
  const guard = new TutorAudioProgressGuard();
  guard.noteTranscript("Halo");
  for (let second = 0; second < 6; second++) expect(guard.allowAudio(1)).toBe(true);
  expect(guard.allowAudio(1)).toBe(false);
  expect(guard.isBlocked).toBe(true);
  expect(guard.allowAudio(1)).toBe(false);
});

test("keeps speech with continuing transcript and resets for the next turn", () => {
  const guard = new TutorAudioProgressGuard();
  for (let part = 0; part < 8; part++) {
    guard.noteTranscript("Pembilang adalah bagian dari pecahan. ");
    expect(guard.allowAudio(3)).toBe(true);
  }
  guard.reset();
  expect(guard.isBlocked).toBe(false);
  guard.noteTranscript("Halo lagi");
  expect(guard.allowAudio(2)).toBe(true);
});

test("bounds audio with no transcription and rejects invalid durations", () => {
  const guard = new TutorAudioProgressGuard();
  expect(guard.allowAudio(10)).toBe(true);
  expect(guard.allowAudio(1)).toBe(false);
  guard.reset();
  expect(guard.allowAudio(Number.NaN)).toBe(false);
});

test("cuts a stretched greeting as soon as its transcript shows it, across chunks", () => {
  const guard = new TutorAudioProgressGuard();
  expect(guard.noteTranscript("Hal")).toBe(false);
  expect(guard.allowAudio(0.5)).toBe(true);
  expect(guard.noteTranscript("oooooo")).toBe(true);
  expect(guard.isBlocked).toBe(true);
  expect(guard.allowAudio(0.5)).toBe(false);
  // More of the loop is not progress; real words after it are.
  expect(guard.noteTranscript("ooooo")).toBe(false);
  expect(guard.lastChunkSpoke).toBe(false);
  expect(guard.noteTranscript(" Jadi pecahan")).toBe(false);
  expect(guard.lastChunkSpoke).toBe(true);
});

test("punctuation and spaces add no audio budget", () => {
  const guard = new TutorAudioProgressGuard();
  guard.noteTranscript("Halo");
  for (let second = 0; second < 4; second++) expect(guard.allowAudio(1)).toBe(true);
  guard.noteTranscript("... ");
  expect(guard.allowAudio(1)).toBe(true);
  expect(guard.allowAudio(1)).toBe(true);
  expect(guard.allowAudio(1)).toBe(false);
});

test("cuts the same word said over and over", () => {
  const guard = new TutorAudioProgressGuard();
  expect(guard.noteTranscript("Halo, halo, halo, ")).toBe(false);
  expect(guard.noteTranscript("halo, halo, halo")).toBe(true);
  expect(guard.isBlocked).toBe(true);
});

test("leaves ordinary answers alone and tidies stretched words for reading", () => {
  const guard = new TutorAudioProgressGuard();
  // Seen from real Gemini: the Roman numerals of chemistry once cut a normal answer.
  for (const chunk of [
    "Maaf, tunggu sebentar. Saat ini ada 1000 siswa. ",
    "Menurut aturan IUPAC, nama senyawa FeCl3 adalah besi(III)",
    " klorida, sedangkan FeCl2 adalah besi(II) klorida. ",
    "Hmmm, coba buka www.contoh.id. Misalnya x, x, x, x, x, dan x. ",
  ]) expect(guard.noteTranscript(chunk)).toBe(false);
  expect(guard.isBlocked).toBe(false);
  expect(tidyTutorTranscript("Halooooo, maaf ya")).toBe("Halo, maaf ya");
  expect(tidyTutorTranscript("besi(III) klorida, Hmm, www")).toBe("besi(III) klorida, Hmm, www");
});

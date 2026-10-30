import { expect, test } from "@playwright/test";
import { TutorAudioProgressGuard } from "../app/features/lms/lib/tutor-audio";

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

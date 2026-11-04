import { expect, test } from "@playwright/test";
import { labPointer, parseLabPointer } from "../app/features/labs/pointer";
import { tutorAudioSeconds } from "../app/features/lms/lib/tutor-audio";
import { TurnAudioClock } from "../app/features/lms/lib/turn-clock";

const PARTS = ["engkol", "pasak", "roda-gigi"];

test("a pointing plan keeps its steps in order, each with the words it belongs to", () => {
  const plan = parseLabPointer(
    {
      steps: [
        { part: "engkol", say: "  Putar   engkol ini ", caption: "Engkol" },
        { part: "pasak", say: "Lalu pasak" },
      ],
    },
    PARTS,
  );
  expect(plan.steps).toEqual([
    { part: "engkol", say: "Putar engkol ini", caption: "Engkol" },
    { part: "pasak", say: "Lalu pasak", caption: null },
  ]);
});

test("a one-step plan flattened into the arguments is still read", () => {
  expect(parseLabPointer({ part: "roda-gigi", say: "Roda gigi ini", caption: "Roda gigi" }, PARTS).steps).toEqual([
    { part: "roda-gigi", say: "Roda gigi ini", caption: "Roda gigi" },
  ]);
});

test("a part the lab does not have is refused, and the message lists the ones it has", () => {
  expect(() => parseLabPointer({ steps: [{ part: "roket", say: "Lihat roket" }] }, PARTS)).toThrow(
    /"roket" tidak ada di lab ini.*engkol, pasak, roda-gigi/,
  );
  expect(() => parseLabPointer({ steps: [{ say: "Lihat sesuatu" }] }, PARTS)).toThrow(/tidak ada di lab ini/);
});

test("no steps, or more than four, are refused", () => {
  for (const args of [undefined, null, {}, { steps: [] }, "engkol"]) {
    expect(() => parseLabPointer(args, PARTS)).toThrow(/1–4 langkah/);
  }
  const five = Array.from({ length: 5 }, () => ({ part: "engkol", say: "Lihat engkol" }));
  expect(() => parseLabPointer({ steps: five }, PARTS)).toThrow(/Maksimal 4/);
});

test("words and captions are cut to a length the screen can hold", () => {
  const [step] = parseLabPointer({ steps: [{ part: "engkol", say: "k".repeat(200), caption: "c".repeat(200) }] }, PARTS).steps;
  expect(step!.say).toHaveLength(80);
  expect(step!.caption).toHaveLength(60);
});

test("steps appear one by one, the ring sits on the latest and never goes back", () => {
  labPointer.clear();
  const plan = parseLabPointer(
    {
      steps: [
        { part: "engkol", say: "Putar engkol", caption: "Engkol" },
        { part: "pasak", say: "Lalu pasak", caption: "Pasak" },
        { part: "roda-gigi", say: "Terakhir roda gigi", caption: "Roda gigi" },
      ],
    },
    PARTS,
  );
  labPointer.show(plan);
  expect(labPointer.get()).toBeNull();
  labPointer.reveal(1);
  expect(labPointer.get()).toEqual({ part: "engkol", caption: "Engkol" });
  labPointer.reveal(3);
  expect(labPointer.get()).toEqual({ part: "roda-gigi", caption: "Roda gigi" });
  labPointer.reveal(2);
  expect(labPointer.get()?.part).toBe("roda-gigi");
  labPointer.clear();
  expect(labPointer.get()).toBeNull();
  // Nothing to reveal once cleared.
  labPointer.reveal(1);
  expect(labPointer.get()).toBeNull();
});

test("a step without words of its own can show at once, and a new plan replaces the old one", () => {
  labPointer.clear();
  labPointer.show(parseLabPointer({ steps: [{ part: "engkol", caption: "Engkol" }] }, PARTS), 1);
  expect(labPointer.get()?.part).toBe("engkol");
  labPointer.show(parseLabPointer({ steps: [{ part: "pasak", say: "Pasak" }] }, PARTS));
  expect(labPointer.get()).toBeNull();
  labPointer.clear();
});

test("heard time follows what was scheduled to play, not the wall clock", () => {
  const clock = new TurnAudioClock();
  clock.receive(2);
  clock.receive(3);
  expect(clock.receivedSeconds()).toBe(5);
  clock.schedule(10, 2);
  clock.schedule(12, 3);
  expect(clock.heardSeconds(9)).toBe(0);
  expect(clock.heardSeconds(11)).toBe(1);
  expect(clock.heardSeconds(12)).toBe(2);
  expect(clock.heardSeconds(13.5)).toBe(3.5);
  expect(clock.heardSeconds(99)).toBe(5);
  // A chunk that arrives late leaves a silence on the timeline, which is not audio heard.
  clock.schedule(20, 1);
  expect(clock.heardSeconds(18)).toBe(5);
  expect(clock.heardSeconds(20.5)).toBe(5.5);
  clock.reset();
  expect(clock.receivedSeconds()).toBe(0);
  expect(clock.heardSeconds(20)).toBe(0);
});

test("a PCM chunk's length is read from its size and rate without decoding it", () => {
  expect(tutorAudioSeconds(Buffer.alloc(48_000).toString("base64"), "audio/pcm;rate=24000")).toBeCloseTo(1, 5);
  expect(tutorAudioSeconds(Buffer.alloc(32_000).toString("base64"), "audio/pcm;rate=16000")).toBeCloseTo(1, 5);
  // No rate in the type: the tutor's own 24 kHz.
  expect(tutorAudioSeconds(Buffer.alloc(48_000).toString("base64"), "audio/pcm")).toBeCloseTo(1, 5);
  // Base64 padding does not count as audio.
  expect(tutorAudioSeconds(Buffer.alloc(5).toString("base64"), "audio/pcm;rate=24000")).toBeCloseTo(2 / 24_000, 8);
  expect(tutorAudioSeconds("", "audio/pcm;rate=24000")).toBe(0);
});

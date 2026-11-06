// The story every Bernalar lab is told through (AGENTS.md, "Lab"): an opening, a tour of the
// machine, then each mission with a line before it and the idea behind it after it. This file
// is the story's data and order, with no React; lab-story.tsx plays it.
//
// A story is written, never generated: the same words for every student, no tutor session.

export type Mood = "tenang" | "senang" | "rayakan";

export type Beat = {
  text: string;
  mood?: Mood;
  /** The `data-lab-part` this beat rings. */
  part?: string;
  caption?: string;
  /** Asks the student to try `part`: what to do. "Lanjut" waits until they touch it. */
  act?: string;
};

export type LabStory<Id extends string = string> = {
  key: string;
  title: string;
  /** What the story is about, and the tour: the parts this lab's first mission needs. */
  opening: Beat[];
  /** `before` sets the scene and may not give the answer away; `after` explains it. */
  missions: Record<Id, { before: Beat[]; after: Beat[] }>;
  closing: { text: string; findings: string[] };
};

export type StoryStep = Beat & {
  scene: string;
  /** The first beat of a mission: the lab moves to that mission here. */
  mission?: number;
  findings?: string[];
};

/** `then` is the mission the student plays when the steps end; null when the story is over. */
export type StoryRun = { steps: StoryStep[]; at: number; then: number | null };

const beats = (list: Beat[], scene: string): StoryStep[] => list.map((beat) => ({ ...beat, scene }));
const babak = (index: number) => `Babak ${index + 1}`;

function before<Id extends string>(story: LabStory<Id>, ids: readonly Id[], index: number): StoryStep[] {
  const [first, ...rest] = beats(story.missions[ids[index]!].before, babak(index));
  return [{ ...first!, mission: index }, ...rest];
}

const closing = (story: LabStory): StoryStep[] => [{ text: story.closing.text, mood: "rayakan", scene: "Penutup", findings: story.closing.findings }];

function onward<Id extends string>(story: LabStory<Id>, ids: readonly Id[], done: readonly string[]) {
  const open = ids.findIndex((id) => !done.includes(id));
  return open === -1 ? { steps: closing(story), then: null } : { steps: before(story, ids, open), then: open };
}

/** A student coming back: the mission they are on, without the opening. */
export function resumeRun<Id extends string>(story: LabStory<Id>, ids: readonly Id[], done: readonly string[]): StoryRun {
  return { ...onward(story, ids, done), at: 0 };
}

/** The first visit: the opening and the tour, then the first open mission. */
export function openingRun<Id extends string>(story: LabStory<Id>, ids: readonly Id[], done: readonly string[]): StoryRun {
  const next = onward(story, ids, done);
  return { steps: [...beats(story.opening, "Pembuka"), ...next.steps], then: next.then, at: 0 };
}

/** A mission just solved: why it came out that way, then on to the next open one. */
export function solvedRun<Id extends string>(story: LabStory<Id>, ids: readonly Id[], done: readonly string[], solved: Id): StoryRun {
  const next = onward(story, ids, done);
  return { steps: [...beats(story.missions[solved].after, babak(ids.indexOf(solved))), ...next.steps], then: next.then, at: 0 };
}

/** Told again from the start, as far as the student has got. */
export function replayRun<Id extends string>(story: LabStory<Id>, ids: readonly Id[], done: readonly string[]): StoryRun {
  const steps = beats(story.opening, "Pembuka");
  for (const [index, id] of ids.entries()) {
    steps.push(...before(story, ids, index));
    if (!done.includes(id)) return { steps, at: 0, then: index };
    steps.push(...beats(story.missions[id].after, babak(index)));
  }
  return { steps: [...steps, ...closing(story)], at: 0, then: null };
}

const seenKey = (key: string) => `nalar:lab-story:${key}`;

export function storySeen(key: string) {
  try {
    return window.localStorage.getItem(seenKey(key)) === "1";
  } catch {
    return false;
  }
}

export function markStorySeen(key: string) {
  try {
    window.localStorage.setItem(seenKey(key), "1");
  } catch {
    // private mode: the opening plays again next time
  }
}

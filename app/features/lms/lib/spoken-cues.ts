/**
 * Ties the tutor's pointing steps to its words. The tutor plans its steps before it speaks,
 * each with the first words it will say about that step (`say`). The spoken transcript is
 * matched against them as it streams in, and every match says from which point of the audio
 * a step belongs on the page, so the pointer moves while the words are heard, not before.
 */

/** Case, accents and punctuation never decide a match: "3/4," and "3 4" are the same words. */
export function speechWords(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** `revealed` steps may now be shown, from `at` seconds into the turn's audio (null: right away). */
export type CueRelease = { revealed: number; at: number | null };

// A missed cue is skipped once a later one is heard, but only this many steps ahead: further
// than that, a match is more likely the tutor reusing a phrase than a step it left out.
const LOOKAHEAD = 2;
// The transcript sometimes runs ahead of its audio, so arrival alone would place words too
// early. Speech never goes faster than about this many (normalized) characters a second,
// which gives each word an earliest time. Measured on the tutor voice: about 14 per second.
const MAX_CHARS_PER_SECOND = 15;

export class SpokenCues {
  private readonly cues: Array<string | null>;
  private raw = "";
  private heard = "";
  // Where each transcript piece ends in `heard`, and the stretch of audio it was spoken over.
  private spans: Array<{ end: number; from: number | null; to: number | null }> = [];
  private searchFrom = 0;
  revealed: number;

  constructor(says: Array<string | undefined>) {
    this.cues = says.map((say) => (say ? speechWords(say) || null : null));
    this.revealed = this.withFollowers(0);
  }

  get total() {
    return this.cues.length;
  }

  get done() {
    return this.revealed >= this.cues.length;
  }

  /**
   * One more piece of the spoken transcript, heard over audio seconds `from`..`to` of the turn
   * (both null when there is no audio to follow, as for a typed question answered in text).
   */
  hear(text: string, from: number | null, to: number | null): CueRelease[] {
    if (!text || this.done) return [];
    this.raw += text;
    this.heard = speechWords(this.raw);
    this.spans.push({ end: this.heard.length, from, to });
    const releases: CueRelease[] = [];
    for (;;) {
      const found = this.nextMatch();
      if (!found) break;
      this.searchFrom = found.position + 1;
      this.revealed = this.withFollowers(found.step + 1);
      releases.push({ revealed: this.revealed, at: this.timeAt(found.position) });
      if (this.done) break;
    }
    return releases;
  }

  /** A step without words of its own appears together with the step before it. */
  private withFollowers(count: number) {
    let next = count;
    while (next < this.cues.length && this.cues[next] === null) next++;
    return next;
  }

  private nextMatch() {
    const last = Math.min(this.cues.length - 1, this.revealed + LOOKAHEAD);
    for (let step = this.revealed; step <= last; step++) {
      const cue = this.cues[step];
      if (!cue) continue;
      const position = this.find(cue);
      if (position !== null) return { step, position };
    }
    return null;
  }

  private find(cue: string): number | null {
    const words = cue.split(" ");
    // Speech transcription may end a phrase differently ("tiga per empat" / "tiga perempat").
    const candidates = words.length >= 3 ? [cue, words.slice(0, -1).join(" ")] : [cue];
    for (const candidate of candidates) {
      let index = this.heard.indexOf(candidate, this.searchFrom);
      while (index >= 0) {
        const before = index === 0 || this.heard[index - 1] === " ";
        const after = this.heard.length === index + candidate.length || this.heard[index + candidate.length] === " ";
        // A cue that ends the transcript so far may still be growing ("pem" of "pembilang").
        const complete = after && (index + candidate.length < this.heard.length || candidate === cue);
        if (before && complete) return index;
        index = this.heard.indexOf(candidate, index + 1);
      }
    }
    return null;
  }

  /**
   * Spread each transcript piece evenly over the audio it arrived with, but never earlier
   * than the words before it could have been spoken.
   */
  private timeAt(position: number): number | null {
    const origin = this.spans.find((span) => span.from !== null)?.from;
    let start = 0;
    let startTime: number | null = null;
    for (const span of this.spans) {
      if (position < span.end || span === this.spans.at(-1)) {
        if (span.to === null) return null;
        const from = span.from ?? startTime ?? span.to;
        const share = span.end > start ? Math.min(1, (position - start) / (span.end - start)) : 0;
        const arrived = from + (span.to - from) * share;
        return Math.max(arrived, (origin ?? 0) + position / MAX_CHARS_PER_SECOND);
      }
      start = span.end;
      startTime = span.to;
    }
    return null;
  }
}

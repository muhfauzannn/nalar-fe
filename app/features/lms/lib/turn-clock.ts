/**
 * Where the tutor's audio is within one turn, for tying its pointing to its words (see
 * spoken-cues.ts): seconds received so far (queued to play) and seconds heard so far
 * (played). Chunks are scheduled back to back, but one that arrives late leaves a gap, so
 * what has been heard follows the schedule and not the clock.
 */
export class TurnAudioClock {
  private received = 0;
  private scheduled = 0;
  private chunks: Array<{ startAt: number; duration: number; before: number }> = [];

  reset() {
    this.received = 0;
    this.scheduled = 0;
    this.chunks = [];
  }

  /** A chunk arrived from the tutor, before it is played. */
  receive(seconds: number) {
    if (seconds > 0) this.received += seconds;
  }

  /** A chunk was put on the audio timeline: it plays from `startAt` (audio context time). */
  schedule(startAt: number, duration: number) {
    this.chunks.push({ startAt, duration, before: this.scheduled });
    this.scheduled += duration;
  }

  receivedSeconds() {
    return this.received;
  }

  /** How many seconds of this turn's audio have played by audio context time `now`. */
  heardSeconds(now: number) {
    for (let index = this.chunks.length - 1; index >= 0; index--) {
      const chunk = this.chunks[index]!;
      if (chunk.startAt <= now) return chunk.before + Math.min(chunk.duration, now - chunk.startAt);
    }
    return 0;
  }
}

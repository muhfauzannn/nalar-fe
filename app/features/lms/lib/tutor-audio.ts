/** Shared browser audio plumbing; no model credentials or session state here. */

/** Gemini Live takes 16 kHz mono PCM from the microphone and answers with 24 kHz PCM. */
export const TUTOR_INPUT_MIME_TYPE = "audio/pcm;rate=16000";
// Versioned so a browser never pairs this page with a cached worklet of another rate.
const WORKLET_URL = "/audio/nalar-input-processor.js?v=3";

/** Decodes one base64 16-bit PCM chunk; the rate comes from its mimeType (24 kHz default). */
export function decodeTutorAudio(base64: string, mimeType: string) {
  const binary = atob(base64);
  const count = Math.floor(binary.length / 2);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const value = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
    samples[i] = (value << 16 >> 16) / 32_768;
  }
  const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1]) || 24_000;
  return { samples, rate };
}

/** How long one base64 16-bit PCM chunk plays, without decoding it. */
export function tutorAudioSeconds(base64: string, mimeType: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((base64.length * 3) / 4) - padding;
  const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1]) || 24_000;
  return Math.max(0, Math.floor(bytes / 2)) / rate;
}

// Three or more of the same letter in a row never happens in Indonesian ("maaf" has two).
const ELONGATED = /(\p{L})\1{2,}/gu;

/** The transcript as it should be read: a stretched "Halooooo" becomes "Halo". */
export function tidyTutorTranscript(text: string) {
  return text.replace(ELONGATED, "$1");
}

/**
 * Stops native audio that has fallen into a loop. Seen with Gemini native audio: a reply that
 * opens with "Halo" turns into "Haloooooo…" and never moves on. Its transcript then either
 * stalls, stretches the same letter, or repeats the same word; none of these count as words
 * spoken, so the audio budget stops growing and the voice is cut.
 */
export class TutorAudioProgressGuard {
  private transcript = "";
  private transcriptLength = 0;
  private audioSeconds = 0;
  private lastTranscriptAudioSeconds = 0;
  private blocked = false;
  // The words of the loop, and whether the latest chunk said anything beyond them.
  private loopWords = new Set<string>();
  private spoke = false;

  get isBlocked() { return this.blocked; }
  /** The latest transcript chunk carried words that are not the loop's. */
  get lastChunkSpoke() { return this.spoke; }

  reset() {
    this.loopWords.clear();
    this.spoke = false;
    this.transcript = "";
    this.transcriptLength = 0;
    this.audioSeconds = 0;
    this.lastTranscriptAudioSeconds = 0;
    this.blocked = false;
  }

  /** Counts the words in a transcript chunk; returns true when this chunk shows a loop. */
  noteTranscript(text: string) {
    if (!text) return false;
    this.transcript += text;
    this.spoke = wordsOf(text).some((word) => word.length > 1 && !this.loopWords.has(word));
    // Chunks split words anywhere ("Hal" + "oooo"), so the loop is looked for at the end of it all.
    const tail = this.transcript.slice(-120);
    if (/(\p{L})\1{2,}/u.test(tail.slice(-text.length - 2)) || repeatsLastWord(tail)) {
      for (const word of wordsOf(tail).slice(-4)) this.loopWords.add(word);
      this.spoke = false;
      if (this.blocked) return false;
      this.blocked = true;
      return true;
    }
    // Progress is measured on the tidied text, so a stretched letter adds nothing.
    const length = spokenLength(this.transcript);
    if (length <= this.transcriptLength) return false;
    this.transcriptLength = length;
    this.lastTranscriptAudioSeconds = this.audioSeconds;
    return false;
  }

  allowAudio(seconds: number) {
    if (this.blocked) return false;
    const next = this.audioSeconds + seconds;
    const budget = this.transcriptLength
      ? Math.max(6, 3 + this.transcriptLength / 3)
      : 10;
    if (!Number.isFinite(seconds) || seconds <= 0 ||
      (next > budget && next - this.lastTranscriptAudioSeconds > 5)) {
      this.blocked = true;
      return false;
    }
    this.audioSeconds = next;
    return true;
  }
}

function wordsOf(text: string) {
  return tidyTutorTranscript(text).toLowerCase().match(/\p{L}+/gu) ?? [];
}

function spokenLength(text: string) {
  return tidyTutorTranscript(text).replace(/[^\p{L}\p{N}]/gu, "").length;
}

/** "halo halo halo halo": the same word four times running is a loop, not an answer. */
function repeatsLastWord(text: string) {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length < 4) return false;
  const last = words.slice(-4);
  return last.every((word) => word === last[0]);
}

/** Microphone → 16 kHz PCM encoder worklet. Returns the worklet node. */
export async function createTutorInputNode(
  context: AudioContext,
  source: MediaStreamAudioSourceNode,
) {
  await context.audioWorklet.addModule(WORKLET_URL);
  const worklet = new AudioWorkletNode(context, "nalar-input-processor");
  source.connect(worklet);
  return worklet;
}

/** How loud the audio passing through `node` is right now, for the voice orb (0..1). */
export class LevelMeter {
  readonly node: AnalyserNode;
  private samples: Float32Array<ArrayBuffer>;
  constructor(context: AudioContext) {
    this.node = context.createAnalyser();
    this.node.fftSize = 512;
    this.samples = new Float32Array(this.node.fftSize);
  }

  level() {
    this.node.getFloatTimeDomainData(this.samples);
    let sum = 0;
    for (const sample of this.samples) sum += sample * sample;
    // Speech RMS sits around 0.05-0.2; scale it into a range the orb can use.
    return Math.min(1, Math.sqrt(sum / this.samples.length) * 5);
  }
}

export class TutorAudioOutput {
  private context: AudioContext | null = null;
  private meter: LevelMeter | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private epoch = 0;
  private queue: Promise<void> = Promise.resolve();
  private progress = new TutorAudioProgressGuard();
  private runawayReported = false;
  // The turn's audio as one stream: how much has arrived, and when each piece plays. Lets
  // the tutor's pointing follow what is being heard rather than what has been generated.
  private received = 0;
  private played: Array<{ offset: number; start: number; duration: number }> = [];
  constructor(
    private onPlaying: (playing: boolean) => void,
    private onRunaway?: () => void,
  ) {}

  beginTurn() {
    this.progress.reset();
    this.runawayReported = false;
    this.received = 0;
    this.played = [];
  }
  get isBlocked() { return this.progress.isBlocked; }
  /** The latest transcript chunk said something beyond the loop the voice fell into. */
  get lastChunkSpoke() { return this.progress.lastChunkSpoke; }

  noteTranscript(text: string) {
    if (this.progress.noteTranscript(text)) this.cutRunaway();
  }

  /** The voice looped: what is already queued is silenced too, not only what comes next. */
  private cutRunaway() {
    this.stop();
    if (this.runawayReported) return;
    this.runawayReported = true;
    this.onRunaway?.();
  }

  /** Seconds of this turn's audio received so far, including what has not played yet. */
  receivedSeconds() {
    return this.received;
  }

  /** How far into this turn's audio the listener is right now, in seconds. */
  heardSeconds() {
    const now = this.context?.currentTime;
    if (now === undefined) return 0;
    let heard = 0;
    for (const piece of this.played) {
      if (piece.start > now) break;
      heard = Math.max(heard, piece.offset + Math.min(now - piece.start, piece.duration));
    }
    return heard;
  }

  async prepare() {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: 24_000 });
      this.meter = new LevelMeter(this.context);
      this.meter.node.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  play(base64: string, mimeType = "audio/pcm;rate=24000") {
    const epoch = this.epoch;
    // Counted on arrival, before decoding, so a transcript arriving with it can be placed.
    const offset = this.received;
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1]) || 24_000;
    this.received += Math.floor((base64.length * 3 / 4 - padding) / 2) / rate;
    const task = this.queue.then(() => this.schedule(base64, mimeType, epoch, offset));
    this.queue = task.catch(() => {});
    return task;
  }

  private async schedule(base64: string, mimeType: string, epoch: number, offset: number) {
    if (epoch !== this.epoch || this.progress.isBlocked) return;
    await this.prepare();
    if (epoch !== this.epoch || !this.context) return;
    const { samples, rate } = decodeTutorAudio(base64, mimeType);
    if (!samples.length) return;
    if (!this.progress.allowAudio(samples.length / rate)) {
      this.cutRunaway();
      return;
    }
    const buffer = this.context.createBuffer(1, samples.length, rate);
    buffer.copyToChannel(samples, 0);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.meter?.node ?? this.context.destination);
    const start = Math.max(this.context.currentTime, this.nextTime);
    this.nextTime = start + buffer.duration;
    this.played.push({ offset, start, duration: buffer.duration });
    this.sources.add(source);
    this.onPlaying(true);
    source.onended = () => {
      source.disconnect();
      this.sources.delete(source);
      if (!this.sources.size) this.onPlaying(false);
    };
    source.start(start);
  }

  /** Loudness of the tutor's voice right now; 0 when nothing plays. */
  level() {
    return this.sources.size && this.meter ? this.meter.level() : 0;
  }

  stop() {
    this.epoch++;
    this.queue = Promise.resolve();
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
      source.disconnect();
    }
    this.sources.clear();
    this.nextTime = 0;
    this.played = [];
    this.onPlaying(false);
  }

  close() {
    this.stop();
    const context = this.context;
    this.context = null;
    this.meter = null;
    return context?.close().catch(() => {});
  }
}

export type TutorMicrophone = { stop: () => Promise<void> };
export async function openTutorMicrophone(
  onAudio: (data: string, level: number) => void,
  isCurrent: () => boolean,
): Promise<TutorMicrophone | null> {
  if (!navigator.mediaDevices?.getUserMedia)
    throw new Error(
      "Mikrofon membutuhkan browser yang mendukung dan koneksi HTTPS.",
    );
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let worklet: AudioWorkletNode | null = null;
  let sink: GainNode | null = null;
  const stop = async () => {
    if (worklet) {
      worklet.port.onmessage = null;
      worklet.disconnect();
    }
    source?.disconnect();
    sink?.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    if (context && context.state !== "closed") await context.close();
  };
  try {
    if (!isCurrent()) {
      await stop();
      return null;
    }
    context = new AudioContext();
    await context.resume();
    if (!isCurrent()) {
      await stop();
      return null;
    }
    source = context.createMediaStreamSource(stream);
    worklet = await createTutorInputNode(context, source);
    sink = context.createGain();
    sink.gain.value = 0;
    worklet.connect(sink);
    sink.connect(context.destination);
    worklet.port.onmessage = (
      event: MessageEvent<{ type: string; pcm: ArrayBuffer; level: number }>,
    ) => {
      if (!isCurrent() || event.data.type !== "audio") return;
      let binary = "";
      for (const byte of new Uint8Array(event.data.pcm))
        binary += String.fromCharCode(byte);
      onAudio(btoa(binary), event.data.level);
    };
    return { stop };
  } catch (error) {
    await stop();
    throw error;
  }
}

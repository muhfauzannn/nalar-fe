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
  constructor(private onPlaying: (playing: boolean) => void) {}

  async prepare() {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: 24_000 });
      this.meter = new LevelMeter(this.context);
      this.meter.node.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  async play(base64: string, mimeType = "audio/pcm;rate=24000") {
    const epoch = this.epoch;
    await this.prepare();
    if (epoch !== this.epoch || !this.context) return;
    const { samples, rate } = decodeTutorAudio(base64, mimeType);
    if (!samples.length) return;
    const buffer = this.context.createBuffer(1, samples.length, rate);
    buffer.copyToChannel(samples, 0);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.meter?.node ?? this.context.destination);
    const start = Math.max(this.context.currentTime, this.nextTime);
    this.nextTime = start + buffer.duration;
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

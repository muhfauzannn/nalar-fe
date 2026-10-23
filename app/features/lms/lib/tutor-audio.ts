/** Shared browser audio plumbing; no model credentials or session state here. */

/**
 * Wire format for tutor audio. G.711 mu-law (8 kHz, 64 kbps) instead of 24 kHz PCM
 * (384 kbps, ~512 kbps as base64 JSON): on a 3G/weak 4G uplink PCM queues up in the socket
 * and answers arrive seconds late. The server confirms the format; older servers say nothing
 * and keep PCM, so both directions always match.
 */
export type TutorAudioFormat = "pcm" | "pcmu";
export const REQUESTED_TUTOR_AUDIO_FORMAT: TutorAudioFormat = "pcmu";
export const tutorAudioFormat = (value: unknown): TutorAudioFormat =>
  value === "pcmu" ? "pcmu" : "pcm";
const WORKLET_URL = "/audio/nalar-input-processor.js?v=2";

const MU_LAW = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const byte = ~i & 0xff;
  const magnitude = ((((byte & 0x0f) << 3) + 0x84) << ((byte & 0x70) >> 4)) - 0x84;
  MU_LAW[i] = (byte & 0x80 ? -magnitude : magnitude) / 32_768;
}

/** Decodes one base64 audio delta; mimeType is what live-tutor-client attached. */
export function decodeTutorAudio(base64: string, mimeType: string) {
  const binary = atob(base64);
  if (mimeType.startsWith("audio/pcmu")) {
    const samples = new Float32Array(binary.length);
    for (let i = 0; i < binary.length; i++) samples[i] = MU_LAW[binary.charCodeAt(i)]!;
    return { samples, rate: 8_000 };
  }
  const count = Math.floor(binary.length / 2);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const value = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
    samples[i] = (value << 16 >> 16) / 32_768;
  }
  return { samples, rate: 24_000 };
}

/** Microphone → (anti-alias filter) → encoder worklet. Returns the worklet node. */
export async function createTutorInputNode(
  context: AudioContext,
  source: MediaStreamAudioSourceNode,
  format: TutorAudioFormat,
) {
  await context.audioWorklet.addModule(WORKLET_URL);
  const worklet = new AudioWorkletNode(context, "nalar-input-processor", {
    processorOptions: { format },
  });
  let tail: AudioNode = source;
  if (format === "pcmu") {
    // Two 12 dB/oct stages: keep speech, stop >4 kHz folding back when decimating to 8 kHz.
    for (let stage = 0; stage < 2; stage++) {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 3_400;
      tail.connect(filter);
      tail = filter;
    }
  }
  tail.connect(worklet);
  return worklet;
}

export class TutorAudioOutput {
  private context: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private epoch = 0;
  constructor(private onPlaying: (playing: boolean) => void) {}

  async prepare() {
    this.context ??= new AudioContext({ sampleRate: 24_000 });
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
    source.connect(this.context.destination);
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
    return context?.close().catch(() => {});
  }
}

export type TutorMicrophone = { stop: () => Promise<void> };
export async function openTutorMicrophone(
  onAudio: (data: string, level: number) => void,
  isCurrent: () => boolean,
  format: TutorAudioFormat = "pcm",
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
    worklet = await createTutorInputNode(context, source, format);
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

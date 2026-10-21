/** Shared browser audio plumbing; no model credentials or session state here. */
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

  async play(base64: string) {
    const epoch = this.epoch;
    await this.prepare();
    if (epoch !== this.epoch || !this.context) return;
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    const count = Math.floor(bytes.length / 2);
    if (!count) return;
    const buffer = this.context.createBuffer(1, count, 24_000);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < count; i++)
      samples[i] = view.getInt16(i * 2, true) / 32768;
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
    await context.audioWorklet.addModule("/audio/nalar-input-processor.js");
    await context.resume();
    if (!isCurrent()) {
      await stop();
      return null;
    }
    source = context.createMediaStreamSource(stream);
    worklet = new AudioWorkletNode(context, "nalar-input-processor");
    sink = context.createGain();
    sink.gain.value = 0;
    source.connect(worklet);
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

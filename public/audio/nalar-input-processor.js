// processorOptions.format: "pcm" (24 kHz 16-bit LE, default) or "pcmu" (8 kHz G.711 mu-law).
// Either way one message carries 100 ms of audio and its input level.
function muLaw(value) {
  let sample = Math.round(value < 0 ? value * 0x8000 : value * 0x7fff);
  const sign = sample < 0 ? 0x80 : 0;
  sample = Math.min(Math.abs(sample), 32635) + 0x84;
  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; exponent -= 1, mask >>= 1);
  return ~(sign | (exponent << 4) | ((sample >> (exponent + 3)) & 0x0f)) & 0xff;
}

class NalarInputProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.muLaw = options?.processorOptions?.format === "pcmu";
    this.targetSampleRate = this.muLaw ? 8000 : 24000;
    this.targetChunkSize = this.targetSampleRate / 10;
    this.pending = [];
    this.resamplePosition = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input?.length) return true;

    const ratio = sampleRate / this.targetSampleRate;
    while (this.resamplePosition < input.length) {
      const leftIndex = Math.floor(this.resamplePosition);
      const rightIndex = Math.min(input.length - 1, leftIndex + 1);
      const fraction = this.resamplePosition - leftIndex;
      this.pending.push(
        input[leftIndex] * (1 - fraction) + input[rightIndex] * fraction,
      );
      this.resamplePosition += ratio;
    }
    this.resamplePosition -= input.length;

    while (this.pending.length >= this.targetChunkSize) {
      const samples = this.pending.splice(0, this.targetChunkSize);
      const encoded = this.muLaw
        ? new Uint8Array(samples.length)
        : new Int16Array(samples.length);
      let energy = 0;
      for (let index = 0; index < samples.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, samples[index]));
        energy += sample * sample;
        encoded[index] = this.muLaw
          ? muLaw(sample)
          : sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      const level = Math.min(1, Math.sqrt(energy / samples.length) * 8);
      this.port.postMessage(
        { type: "audio", pcm: encoded.buffer, level },
        [encoded.buffer],
      );
    }
    return true;
  }
}

registerProcessor("nalar-input-processor", NalarInputProcessor);

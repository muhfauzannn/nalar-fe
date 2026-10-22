class NalarInputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 24000;
    this.targetChunkSize = 2400;
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
      const pcm = new Int16Array(samples.length);
      let energy = 0;
      for (let index = 0; index < samples.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, samples[index]));
        energy += sample * sample;
        pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      const level = Math.min(1, Math.sqrt(energy / samples.length) * 8);
      this.port.postMessage(
        { type: "audio", pcm: pcm.buffer, level },
        [pcm.buffer],
      );
    }
    return true;
  }
}

registerProcessor("nalar-input-processor", NalarInputProcessor);

class IrtakiTarteelPcmProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const settings = options.processorOptions || {};

    this.targetSampleRate = 16000;
    this.packetFrames = Math.round(
      this.targetSampleRate * (settings.packetSeconds ?? 0.2),
    );

    this.inputSampleRate = sampleRate;
    this.inputFrameIndex = 0;
    this.nextOutputPosition = 0;
    this.previousSample = 0;
    this.hasPreviousSample = false;

    this.packet = new Float32Array(this.packetFrames);
    this.packetIndex = 0;
    this.sequence = 0;

    this.paused = false;
    this.stopped = false;

    this.port.onmessage = (event) => {
      const type = event.data?.type;

      if (type === "pause") {
        this.flushPacket();
        this.paused = true;
        this.port.postMessage({ type: "paused" });
        return;
      }

      if (type === "resume") {
        this.paused = false;
        this.port.postMessage({ type: "resumed" });
        return;
      }

      if (type === "stop") {
        this.flushPacket();
        this.stopped = true;
        this.port.postMessage({ type: "stopped" });
      }
    };
  }

  emitPacket() {
    if (this.packetIndex === 0) return;

    const samples = this.packet.slice(0, this.packetIndex);

    this.port.postMessage(
      {
        type: "pcm",
        sequence: this.sequence,
        sampleRate: this.targetSampleRate,
        frameCount: samples.length,
        samples,
      },
      [samples.buffer],
    );

    this.sequence += 1;
    this.packetIndex = 0;
  }

  flushPacket() {
    this.emitPacket();
  }

  pushSample(value) {
    this.packet[this.packetIndex] = value;
    this.packetIndex += 1;

    if (this.packetIndex >= this.packetFrames) {
      this.emitPacket();
    }
  }

  process(inputs, outputs) {
    // Le processeur ne doit jamais renvoyer le microphone aux haut-parleurs.
    for (const output of outputs) {
      for (const channel of output) {
        channel.fill(0);
      }
    }

    if (this.stopped) return false;
    if (this.paused) return true;

    const channels = inputs[0];

    if (!channels || channels.length === 0 || channels[0].length === 0) {
      return true;
    }

    const inputFrames = channels[0].length;
    const channelCount = channels.length;
    const step = this.inputSampleRate / this.targetSampleRate;

    for (let frame = 0; frame < inputFrames; frame += 1) {
      let monoSample = 0;

      for (let channel = 0; channel < channelCount; channel += 1) {
        monoSample += channels[channel][frame] || 0;
      }

      monoSample /= channelCount;

      const currentIndex = this.inputFrameIndex;

      if (!this.hasPreviousSample) {
        this.pushSample(monoSample);
        this.previousSample = monoSample;
        this.hasPreviousSample = true;
        this.nextOutputPosition = step;
      } else {
        while (this.nextOutputPosition <= currentIndex) {
          const fraction =
            this.nextOutputPosition - (currentIndex - 1);

          const interpolated =
            this.previousSample +
            (monoSample - this.previousSample) * fraction;

          this.pushSample(interpolated);
          this.nextOutputPosition += step;
        }

        this.previousSample = monoSample;
      }

      this.inputFrameIndex += 1;
    }

    return true;
  }
}

registerProcessor(
  "irtaki-tarteel-pcm-processor",
  IrtakiTarteelPcmProcessor,
);

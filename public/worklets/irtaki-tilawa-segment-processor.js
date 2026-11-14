class IrtakiTilawaSegmentProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const settings = options.processorOptions || {};

    this.windowFrames = Math.max(
      1,
      Math.round(sampleRate * (settings.windowSeconds ?? 3)),
    );

    this.hopFrames = Math.max(
      1,
      Math.round(sampleRate * (settings.hopSeconds ?? 1.5)),
    );

    this.minFinalFrames = Math.max(
      1,
      Math.round(sampleRate * (settings.minFinalSeconds ?? 0.55)),
    );

    this.buffer = new Float32Array(this.windowFrames);
    this.writeIndex = 0;
    this.availableFrames = 0;
    this.totalFrames = 0;
    this.framesSinceEmission = 0;
    this.sequence = 0;
    this.emitted = false;
    this.paused = false;
    this.stopped = false;

    this.port.onmessage = (event) => {
      this.handleCommand(event.data?.type);
    };
  }

  clearWindow() {
    this.writeIndex = 0;
    this.availableFrames = 0;
    this.framesSinceEmission = 0;
  }

  handleCommand(type) {
    if (type === "pause") {
      this.flush(false);
      this.clearWindow();
      this.paused = true;
      this.port.postMessage({ type: "paused" });
      return;
    }

    if (type === "resume") {
      this.clearWindow();
      this.paused = false;
      this.port.postMessage({ type: "resumed" });
      return;
    }

    if (type === "stop") {
      this.flush(true);
      this.stopped = true;
      this.port.postMessage({ type: "stopped" });
      return;
    }
  }

  flush(isFinal) {
    if (this.availableFrames === 0) return;

    const shouldEmit =
      this.framesSinceEmission >= this.minFinalFrames ||
      (!this.emitted &&
        this.availableFrames >= this.minFinalFrames);

    if (shouldEmit) {
      this.emit(isFinal);
    }
  }

  emit(isFinal) {
    const frameCount = this.availableFrames;
    if (frameCount === 0) return;

    const samples = new Float32Array(this.windowFrames);
    const firstIndex =
      (this.writeIndex - frameCount + this.windowFrames) %
      this.windowFrames;

    const leftPadding = this.windowFrames - frameCount;

    for (let index = 0; index < frameCount; index += 1) {
      const sourceIndex =
        (firstIndex + index) % this.windowFrames;

      samples[leftPadding + index] = this.buffer[sourceIndex];
    }

    const endFrame = this.totalFrames;
    const startFrame = endFrame - frameCount;

    this.port.postMessage(
      {
        type: "segment",
        sequence: this.sequence,
        sampleRate,
        startSeconds: startFrame / sampleRate,
        endSeconds: endFrame / sampleRate,
        frameCount,
        paddedFrames: leftPadding,
        isFinal,
        samples,
      },
      [samples.buffer],
    );

    this.sequence += 1;
    this.emitted = true;
    this.framesSinceEmission = 0;
  }

  process(inputs, outputs) {
    for (const output of outputs) {
      for (const channel of output) {
        channel.fill(0);
      }
    }

    if (this.stopped) return false;
    if (this.paused) return true;

    const channels = inputs[0];

    if (!channels || channels.length === 0) {
      return true;
    }

    const frameCount = channels[0].length;
    const channelCount = channels.length;

    for (let frame = 0; frame < frameCount; frame += 1) {
      let monoSample = 0;

      for (let channel = 0; channel < channelCount; channel += 1) {
        monoSample += channels[channel][frame] || 0;
      }

      monoSample /= channelCount;

      this.buffer[this.writeIndex] = monoSample;

      this.writeIndex =
        (this.writeIndex + 1) % this.windowFrames;

      this.availableFrames = Math.min(
        this.windowFrames,
        this.availableFrames + 1,
      );

      this.totalFrames += 1;
      this.framesSinceEmission += 1;

      const firstCompleteWindow =
        this.availableFrames === this.windowFrames &&
        !this.emitted;

      const nextWindowReady =
        this.availableFrames === this.windowFrames &&
        this.emitted &&
        this.framesSinceEmission >= this.hopFrames;

      if (firstCompleteWindow || nextWindowReady) {
        this.emit(false);
      }
    }

    return true;
  }
}

registerProcessor(
  "irtaki-tilawa-segment-processor",
  IrtakiTilawaSegmentProcessor,
);

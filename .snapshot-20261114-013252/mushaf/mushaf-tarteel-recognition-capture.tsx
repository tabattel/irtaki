"use client";

import { useEffect } from "react";

type TarteelMode = "tarteel1" | "tarteel2";
type LifecycleAction = "start" | "pause" | "resume" | "stop";

type LifecycleDetail = {
  sessionId: string;
  track: MediaStreamTrack;
  mode: TarteelMode;
  action: LifecycleAction;
};

type PcmDetail = {
  sessionId: string;
  mode: TarteelMode;
  sequence: number;
  sampleRate: number;
  samples: Float32Array;
};

type StatusDetail = {
  sessionId: string;
  mode: TarteelMode;
  status: "capturing" | "paused" | "stopped" | "error";
  message?: string;
};

type Runtime = {
  sessionId: string;
  mode: TarteelMode;
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: AudioWorkletNode;
  track: MediaStreamTrack;
  closing: boolean;
};

function dispatchStatus(detail: StatusDetail) {
  window.dispatchEvent(
    new CustomEvent<StatusDetail>("irtaki:tarteel-recognition-status", {
      detail,
    }),
  );
}

export function MushafTarteelRecognitionCapture() {
  useEffect(() => {
    let runtime: Runtime | null = null;
    let operationQueue = Promise.resolve();

    function enqueue(operation: () => Promise<void>) {
      operationQueue = operationQueue
        .then(operation)
        .catch((error: unknown) => {
          const current = runtime;

          if (current) {
            dispatchStatus({
              sessionId: current.sessionId,
              mode: current.mode,
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "TARTEEL_CAPTURE_ERROR",
            });
          }
        });
    }

    async function cleanup(current: Runtime) {
      if (current.closing) return;
      current.closing = true;

      current.processor.port.onmessage = null;

      try {
        current.source.disconnect();
      } catch {}

      try {
        current.processor.disconnect();
      } catch {}

      try {
        await current.context.close();
      } catch {}

      if (runtime === current) {
        runtime = null;
      }
    }

    async function start(detail: LifecycleDetail) {
      if (runtime) {
        if (runtime.sessionId === detail.sessionId) return;
        await cleanup(runtime);
      }

      if (detail.track.readyState !== "live") {
        throw new Error("TARTEEL_MICROPHONE_TRACK_NOT_LIVE");
      }

      const context = new AudioContext({
        latencyHint: "interactive",
      });

      let source: MediaStreamAudioSourceNode | null = null;
      let processor: AudioWorkletNode | null = null;

      try {
        await context.audioWorklet.addModule(
          "/worklets/irtaki-tarteel-pcm-processor.js",
        );

        if (context.state === "suspended") {
          await context.resume();
        }

        source = context.createMediaStreamSource(
          new MediaStream([detail.track]),
        );

        processor = new AudioWorkletNode(
          context,
          "irtaki-tarteel-pcm-processor",
          {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            channelCount: 1,
            channelCountMode: "max",
            outputChannelCount: [1],
            processorOptions: {
              packetSeconds: 0.2,
            },
          },
        );

        const current: Runtime = {
          sessionId: detail.sessionId,
          mode: detail.mode,
          context,
          source,
          processor,
          track: detail.track,
          closing: false,
        };

        runtime = current;

        processor.port.onmessage = (event: MessageEvent) => {
          if (runtime !== current || current.closing) return;

          const data = event.data;

          if (data?.type === "pcm" && data.samples instanceof Float32Array) {
            const pcmDetail: PcmDetail = {
              sessionId: current.sessionId,
              mode: current.mode,
              sequence: data.sequence,
              sampleRate: data.sampleRate,
              samples: data.samples,
            };

            window.dispatchEvent(
              new CustomEvent<PcmDetail>("irtaki:tarteel-pcm", {
                detail: pcmDetail,
              }),
            );
          }
        };

        source.connect(processor);
        processor.connect(context.destination);

        if (context.state !== "running") {
          throw new Error("TARTEEL_AUDIO_CONTEXT_NOT_RUNNING");
        }

        dispatchStatus({
          sessionId: detail.sessionId,
          mode: detail.mode,
          status: "capturing",
        });
      } catch (error) {
        if (source) {
          try {
            source.disconnect();
          } catch {}
        }

        if (processor) {
          try {
            processor.disconnect();
          } catch {}
        }

        try {
          await context.close();
        } catch {}

        if (runtime?.sessionId === detail.sessionId) {
          runtime = null;
        }

        throw error;
      }
    }

    async function handleLifecycle(detail: LifecycleDetail) {
      if (!detail?.sessionId || !detail.mode) return;

      if (detail.action === "start") {
        await start(detail);
        return;
      }

      const current = runtime;

      if (!current || current.sessionId !== detail.sessionId) return;

      if (detail.action === "pause") {
        current.processor.port.postMessage({ type: "pause" });

        dispatchStatus({
          sessionId: current.sessionId,
          mode: current.mode,
          status: "paused",
        });

        return;
      }

      if (detail.action === "resume") {
        if (current.context.state === "suspended") {
          await current.context.resume();
        }

        current.processor.port.postMessage({ type: "resume" });

        dispatchStatus({
          sessionId: current.sessionId,
          mode: current.mode,
          status: "capturing",
        });

        return;
      }

      if (detail.action === "stop") {
        current.processor.port.postMessage({ type: "stop" });

        await cleanup(current);

        dispatchStatus({
          sessionId: current.sessionId,
          mode: current.mode,
          status: "stopped",
        });
      }
    }

    function handleLifecycleEvent(event: Event) {
      const detail = (event as CustomEvent<LifecycleDetail>).detail;
      if (!detail) return;

      enqueue(() => handleLifecycle(detail));
    }

    window.addEventListener(
      "irtaki:tarteel-recognition",
      handleLifecycleEvent,
    );

    return () => {
      window.removeEventListener(
        "irtaki:tarteel-recognition",
        handleLifecycleEvent,
      );

      const current = runtime;
      if (current) {
        void cleanup(current);
      }
    };
  }, []);

  return null;
}

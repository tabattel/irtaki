"use client";

import { useEffect } from "react";

type AyahReference = {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
};

type LifecycleAction = "start" | "pause" | "resume" | "stop";

type LifecycleDetail = {
  action: LifecycleAction;
  sessionId: string;
  track: MediaStreamTrack;
  learnerId: string;
  ayahIds: number[];
  ayahs: AyahReference[];
  tracked: boolean;
};

type ProcessorSegment = {
  type: "segment";
  sequence: number;
  sampleRate: number;
  startSeconds: number;
  endSeconds: number;
  frameCount: number;
  paddedFrames: number;
  isFinal: boolean;
  samples: Float32Array;
};

type ProcessorMessage =
  | ProcessorSegment
  | { type: "paused" | "resumed" | "stopped" };

type RecognitionRuntime = {
  sessionId: string;
  learnerId: string;
  ayahIds: number[];
  ayahs: AyahReference[];
  tracked: boolean;
  track: MediaStreamTrack;
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  node: AudioWorkletNode;
  silentGain: GainNode;
  acknowledgements: Map<string, () => void>;
  onTrackEnded: () => void;
};

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Erreur inconnue de capture audio";
}

export function RatilRecognitionCapture() {
  useEffect(() => {
    let active: RecognitionRuntime | null = null;
    let queue: Promise<void> = Promise.resolve();
    let disposed = false;

    function publishStatus(
      sessionId: string,
      status: "capturing" | "paused" | "stopped" | "error",
      message?: string,
    ) {
      window.dispatchEvent(
        new CustomEvent("irtaki:ratil-recognition-status", {
          detail: { sessionId, status, message },
        }),
      );
    }

    function disposeRuntime(runtime: RecognitionRuntime): Promise<void> {
      runtime.track.removeEventListener(
        "ended",
        runtime.onTrackEnded,
      );

      runtime.node.port.onmessage = null;

      try {
        runtime.source.disconnect();
      } catch {}

      try {
        runtime.node.disconnect();
        runtime.node.port.close();
      } catch {}

      try {
        runtime.silentGain.disconnect();
      } catch {}

      if (runtime.context.state !== "closed") {
        return runtime.context.close().catch(() => {});
      }

      return Promise.resolve();
    }

    function sendCommand(
      runtime: RecognitionRuntime,
      command: "pause" | "resume" | "stop",
      acknowledgement: "paused" | "resumed" | "stopped",
    ): Promise<void> {
      return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          runtime.acknowledgements.delete(acknowledgement);
          reject(
            new Error(`AUDIOWORKLET_ACK_TIMEOUT_${acknowledgement}`),
          );
        }, 5000);

        runtime.acknowledgements.set(acknowledgement, () => {
          window.clearTimeout(timeout);
          runtime.acknowledgements.delete(acknowledgement);
          resolve();
        });

        runtime.node.port.postMessage({ type: command });
      });
    }

    async function startRuntime(detail: LifecycleDetail) {
      if (active?.sessionId === detail.sessionId) return;

      if (active) {
        const previous = active;
        active = null;
        await disposeRuntime(previous);
      }

      if (detail.track.readyState !== "live") {
        throw new Error("MICROPHONE_TRACK_NOT_LIVE");
      }

      let context: AudioContext | null = null;
      let runtime: RecognitionRuntime | null = null;

      try {
        context = new AudioContext({
          latencyHint: "interactive",
        });

        await context.audioWorklet.addModule(
          "/worklets/irtaki-ratil-segment-processor.js",
        );

        if (disposed || detail.track.readyState !== "live") {
          await context.close();
          return;
        }

        const stream = new MediaStream([detail.track]);
        const source = context.createMediaStreamSource(stream);

        const node = new AudioWorkletNode(
          context,
          "irtaki-ratil-segment-processor",
          {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1],
            channelCount: 1,
            channelCountMode: "explicit",
            processorOptions: {
              windowSeconds: 3,
              hopSeconds: 1.5,
              minFinalSeconds: 0.55,
            },
          },
        );

        const silentGain = context.createGain();
        silentGain.gain.value = 0;

        const onTrackEnded = () => {
          queue = queue
            .then(async () => {
              if (active?.sessionId !== detail.sessionId) return;

              const current = active;
              active = null;

              publishStatus(
                detail.sessionId,
                "error",
                "La piste microphone a été interrompue.",
              );

              await disposeRuntime(current);
            })
            .catch(() => {});
        };

        runtime = {
          sessionId: detail.sessionId,
          learnerId: detail.learnerId,
          ayahIds: detail.ayahIds,
          ayahs: detail.ayahs,
          tracked: detail.tracked,
          track: detail.track,
          context,
          source,
          node,
          silentGain,
          acknowledgements: new Map(),
          onTrackEnded,
        };

        active = runtime;

        node.port.onmessage = (
          event: MessageEvent<ProcessorMessage>,
        ) => {
          const data = event.data;

          if (data.type === "segment") {
            window.dispatchEvent(
              new CustomEvent("irtaki:ratil-recognition-segment", {
                detail: {
                  sessionId: detail.sessionId,
                  learnerId: detail.learnerId,
                  ayahIds: detail.ayahIds,
                  ayahs: detail.ayahs,
                  tracked: detail.tracked,
                  sequence: data.sequence,
                  sampleRate: data.sampleRate,
                  startSeconds: data.startSeconds,
                  endSeconds: data.endSeconds,
                  frameCount: data.frameCount,
                  paddedFrames: data.paddedFrames,
                  isFinal: data.isFinal,
                  samples: data.samples,
                },
              }),
            );
            return;
          }

          runtime?.acknowledgements.get(data.type)?.();
        };

        detail.track.addEventListener(
          "ended",
          onTrackEnded,
          { once: true },
        );

        source.connect(node);
        node.connect(silentGain);
        silentGain.connect(context.destination);

        await context.resume();

        if (context.state !== "running") {
          throw new Error("AUDIO_CONTEXT_NOT_RUNNING");
        }

        publishStatus(detail.sessionId, "capturing");
      } catch (error) {
        if (runtime && active === runtime) {
          active = null;
          await disposeRuntime(runtime);
        } else if (context && context.state !== "closed") {
          await context.close().catch(() => {});
        }

        throw error;
      }
    }

    async function handleLifecycle(detail: LifecycleDetail) {
      if (detail.action === "start") {
        await startRuntime(detail);
        return;
      }

      const runtime = active;

      if (!runtime || runtime.sessionId !== detail.sessionId) {
        return;
      }

      if (detail.action === "pause") {
        await sendCommand(runtime, "pause", "paused");
        publishStatus(runtime.sessionId, "paused");
        return;
      }

      if (detail.action === "resume") {
        if (runtime.context.state === "suspended") {
          await runtime.context.resume();
        }

        await sendCommand(runtime, "resume", "resumed");
        publishStatus(runtime.sessionId, "capturing");
        return;
      }

      if (detail.action === "stop") {
        try {
          if (runtime.context.state === "suspended") {
            await runtime.context.resume();
          }

          await sendCommand(runtime, "stop", "stopped");
        } finally {
          if (active === runtime) active = null;

          await disposeRuntime(runtime);
          publishStatus(runtime.sessionId, "stopped");
        }
      }
    }

    function handleLifecycleEvent(event: Event) {
      const detail = (
        event as CustomEvent<LifecycleDetail>
      ).detail;

      if (
        !detail ||
        !["start", "pause", "resume", "stop"].includes(detail.action)
      ) {
        return;
      }

      queue = queue
        .then(() => handleLifecycle(detail))
        .catch((error: unknown) => {
          publishStatus(
            detail.sessionId,
            "error",
            errorMessage(error),
          );
        });
    }

    window.addEventListener(
      "irtaki:ratil-recognition",
      handleLifecycleEvent,
    );

    return () => {
      disposed = true;

      window.removeEventListener(
        "irtaki:ratil-recognition",
        handleLifecycleEvent,
      );

      const runtime = active;
      active = null;

      if (runtime) {
        void (async () => {
          try {
            if (runtime.context.state === "suspended") {
              await runtime.context.resume();
            }

            await sendCommand(runtime, "stop", "stopped");
          } catch {
            // La libération reste prioritaire lors du démontage.
          } finally {
            await disposeRuntime(runtime);
          }
        })();
      }
    };
  }, []);

  return null;
}

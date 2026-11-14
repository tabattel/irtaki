"use client";

import { useEffect } from "react";

type RecognitionSegmentDetail = {
  sessionId: string;
  learnerId: string;
  ayahIds: number[];
  sequence: number;
  sampleRate: number;
  startSeconds: number;
  endSeconds: number;
  frameCount: number;
  paddedFrames: number;
  isFinal: boolean;
  samples: Float32Array;
};

type RecognitionResult = {
  sessionId: string;
  sequence: number;
  startSeconds: number;
  endSeconds: number;
  isFinal: boolean;
  transcription: string;
  normalizedTranscription: string;
  modelId: string;
  modelVersion: string;
  processingDevice: string;
  inferenceDurationMs: number;
  audioDurationMs: number;
};

function publishError(
  detail: RecognitionSegmentDetail,
  message: string,
) {
  window.dispatchEvent(
    new CustomEvent("irtaki:tartil-recognition-error", {
      detail: {
        sessionId: detail.sessionId,
        sequence: detail.sequence,
        message,
      },
    }),
  );
}

export function MushafTartilRecognitionClient() {
  useEffect(() => {
    let queue = Promise.resolve();

    async function sendSegment(
      detail: RecognitionSegmentDetail,
    ): Promise<void> {
      if (
        !detail ||
        typeof detail.sessionId !== "string" ||
        typeof detail.learnerId !== "string" ||
        !Number.isInteger(detail.sequence) ||
        detail.sequence < 0 ||
        !Number.isInteger(detail.sampleRate) ||
        detail.sampleRate < 8000 ||
        detail.sampleRate > 96000 ||
        !Number.isInteger(detail.paddedFrames) ||
        detail.paddedFrames < 0 ||
        !Number.isInteger(detail.frameCount) ||
        detail.frameCount <= 0 ||
        !(detail.samples instanceof Float32Array) ||
        detail.samples.length !==
          detail.frameCount + detail.paddedFrames ||
        !Number.isFinite(detail.startSeconds) ||
        !Number.isFinite(detail.endSeconds) ||
        detail.endSeconds <= detail.startSeconds
      ) {
        publishError(detail, "INVALID_AUDIO_SEGMENT");
        return;
      }

      // AudioWorklet complète les fenêtres courtes avec du silence
      // à gauche. Ce remplissage ne doit pas entrer dans Whisper.
      const actualSamples = detail.samples
        .subarray(detail.paddedFrames)
        .slice();

      const minimumSamples = Math.ceil(detail.sampleRate * 0.25);

      if (actualSamples.length < minimumSamples) {
        publishError(detail, "AUDIO_SEGMENT_TOO_SHORT");
        return;
      }

      const payload = actualSamples.buffer as ArrayBuffer;

      try {
        const response = await fetch(
          "/api/tartil/recognition/segment",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "X-Tartil-Learner-Id": detail.learnerId,
              "X-Tartil-Session-Id": detail.sessionId,
              "X-Tartil-Sequence": String(detail.sequence),
              "X-Tartil-Sample-Rate": String(detail.sampleRate),
              "X-Tartil-Start-Seconds": String(detail.startSeconds),
              "X-Tartil-End-Seconds": String(detail.endSeconds),
              "X-Tartil-Is-Final": String(detail.isFinal),
            },
            body: payload,
            cache: "no-store",
          },
        );

        const result = (await response.json().catch(() => null)) as
          | RecognitionResult
          | { error?: string }
          | null;

        if (
          !response.ok ||
          !result ||
          !("transcription" in result) ||
          typeof result.transcription !== "string"
        ) {
          const message =
            result && "error" in result && typeof result.error === "string"
              ? result.error
              : `RECOGNITION_HTTP_${response.status}`;

          publishError(detail, message);
          return;
        }

        window.dispatchEvent(
          new CustomEvent<RecognitionResult>(
            "irtaki:tartil-recognition-result",
            {
              detail: result,
            },
          ),
        );
      } catch (error) {
        publishError(
          detail,
          error instanceof Error
            ? error.message
            : "RECOGNITION_NETWORK_ERROR",
        );
      }
    }

    function handleSegmentEvent(event: Event) {
      const detail = (
        event as CustomEvent<RecognitionSegmentDetail>
      ).detail;

      if (!detail) return;

      // Une seule requête à la fois : les segments restent ordonnés.
      queue = queue
        .then(() => sendSegment(detail))
        .catch((error: unknown) => {
          publishError(
            detail,
            error instanceof Error
              ? error.message
              : "RECOGNITION_QUEUE_ERROR",
          );
        });
    }

    window.addEventListener(
      "irtaki:tartil-recognition-segment",
      handleSegmentEvent,
    );

    return () => {
      window.removeEventListener(
        "irtaki:tartil-recognition-segment",
        handleSegmentEvent,
      );
    };
  }, []);

  return null;
}

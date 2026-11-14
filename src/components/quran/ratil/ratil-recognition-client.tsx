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

export type RatilRecognitionWord = {
  text: string;
  word: string;
  start: number;
  end: number;
  probability: number | null;
  sequence: number;
  segmentIndex: number;
};

export type RatilRecognitionResult = {
  sessionId: string;
  sequence: number;
  isFinal: boolean;
  transcription: string;
  normalizedTranscription: string;
  sessionStartSeconds: number;
  sessionEndSeconds: number;
  words: RatilRecognitionWord[];
  wordTimestamps: true;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecognitionWord(
  value: unknown,
  expectedSequence: number,
): value is RatilRecognitionWord {
  if (typeof value !== "object" || value === null) return false;

  const word = value as Record<string, unknown>;

  return (
    typeof word.text === "string" &&
    word.text.length > 0 &&
    typeof word.word === "string" &&
    word.word.length > 0 &&
    isFiniteNumber(word.start) &&
    isFiniteNumber(word.end) &&
    word.end > word.start &&
    (word.probability === null || isFiniteNumber(word.probability)) &&
    Number.isInteger(word.sequence) &&
    word.sequence === expectedSequence &&
    Number.isInteger(word.segmentIndex) &&
    (word.segmentIndex as number) >= 0
  );
}

function isRecognitionResult(value: unknown): value is RatilRecognitionResult {
  if (typeof value !== "object" || value === null) return false;

  const result = value as Record<string, unknown>;

  if (
    typeof result.sessionId !== "string" ||
    !result.sessionId ||
    !Number.isInteger(result.sequence) ||
    (result.sequence as number) < 0 ||
    typeof result.isFinal !== "boolean" ||
    typeof result.transcription !== "string" ||
    typeof result.normalizedTranscription !== "string" ||
    !isFiniteNumber(result.sessionStartSeconds) ||
    !isFiniteNumber(result.sessionEndSeconds) ||
    result.sessionStartSeconds < 0 ||
    result.sessionEndSeconds <= result.sessionStartSeconds ||
    result.wordTimestamps !== true ||
    !Array.isArray(result.words)
  ) {
    return false;
  }

  return result.words.every((word) =>
    isRecognitionWord(word, result.sequence as number),
  );
}

function publishError(detail: RecognitionSegmentDetail, message: string) {
  window.dispatchEvent(
    new CustomEvent("irtaki:ratil-recognition-error", {
      detail: {
        sessionId: detail.sessionId,
        sequence: detail.sequence,
        message,
      },
    }),
  );
}

export function RatilRecognitionClient() {
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
        detail.samples.length !== detail.frameCount + detail.paddedFrames ||
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
        const response = await fetch("/api/ratil/recognition/segment", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Ratil-Learner-Id": detail.learnerId,
            "X-Ratil-Session-Id": detail.sessionId,
            "X-Ratil-Sequence": String(detail.sequence),
            "X-Ratil-Sample-Rate": String(detail.sampleRate),
            "X-Ratil-Start-Seconds": String(detail.startSeconds),
            "X-Ratil-End-Seconds": String(detail.endSeconds),
            "X-Ratil-Is-Final": String(detail.isFinal),
          },
          body: payload,
          cache: "no-store",
        });

        const result: unknown = await response.json().catch(() => null);

        if (!response.ok || !isRecognitionResult(result)) {
          const serverError =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : null;

          const message =
            serverError ??
            (!response.ok
              ? `RECOGNITION_HTTP_${response.status}`
              : "INVALID_RECOGNITION_RESPONSE");

          publishError(detail, message);
          return;
        }

        window.dispatchEvent(
          new CustomEvent<RatilRecognitionResult>(
            "irtaki:ratil-recognition-result",
            {
              detail: result,
            },
          ),
        );
      } catch (error) {
        publishError(
          detail,
          error instanceof Error ? error.message : "RECOGNITION_NETWORK_ERROR",
        );
      }
    }

    function handleSegmentEvent(event: Event) {
      const detail = (event as CustomEvent<RecognitionSegmentDetail>).detail;

      if (!detail) return;

      // Une seule requête à la fois : les segments restent ordonnés.
      queue = queue
        .then(() => sendSegment(detail))
        .catch((error: unknown) => {
          publishError(
            detail,
            error instanceof Error ? error.message : "RECOGNITION_QUEUE_ERROR",
          );
        });
    }

    window.addEventListener(
      "irtaki:ratil-recognition-segment",
      handleSegmentEvent,
    );

    return () => {
      window.removeEventListener(
        "irtaki:ratil-recognition-segment",
        handleSegmentEvent,
      );
    };
  }, []);

  return null;
}

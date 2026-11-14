import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { createLearningEngine } from "@/application/learning/learning-engine";
import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 2_000_000;
const MIN_SAMPLE_RATE = 8000;
const MAX_SAMPLE_RATE = 96000;
const MAX_AUDIO_SECONDS = 5;

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function parseIntegerHeader(
  request: Request,
  name: string,
): number | null {
  const raw = request.headers.get(name);

  if (!raw || !/^\d+$/.test(raw)) return null;

  const value = Number(raw);

  return Number.isSafeInteger(value) ? value : null;
}

function parseTimeHeader(
  request: Request,
  name: string,
): number | null {
  const raw = request.headers.get(name);

  if (!raw || raw.length > 32) return null;

  const value = Number(raw);

  return Number.isFinite(value) ? value : null;
}

async function readBoundedBody(
  request: Request,
): Promise<Buffer | null> {
  const reader = request.body?.getReader();

  if (!reader) return null;

  const chunks: Buffer[] = [];
  let total = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;
      if (!value) continue;

      total += value.byteLength;

      if (total > MAX_AUDIO_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }

      chunks.push(
        Buffer.from(value.buffer, value.byteOffset, value.byteLength),
      );
    }
  } finally {
    reader.releaseLock();
  }

  return total > 0 ? Buffer.concat(chunks, total) : null;
}

async function readRecognitionToken(): Promise<string | null> {
  const tokenPath =
    process.env.TILAWA_RECOGNITION_TOKEN_FILE ??
    join(homedir(), ".config", "irtaki", "tilawa-recognition.token");

  try {
    const token = (await readFile(tokenPath, "utf8")).trim();

    return /^[0-9a-f]{64}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

function getLocalRecognitionUrl(): URL | null {
  try {
    const url = new URL(
      process.env.TILAWA_RECOGNITION_URL ??
        "http://127.0.0.1:8765",
    );

    if (
      url.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "::1"].includes(url.hostname)
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      if (origin !== new URL(request.url).origin) {
        return errorResponse("CROSS_ORIGIN_REQUEST_REJECTED", 403);
      }
    } catch {
      return errorResponse("INVALID_REQUEST_ORIGIN", 403);
    }
  }

  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return errorResponse("UNAUTHORIZED", 401);
  }

  const learnerId = request.headers.get("x-tartil-learner-id");
  const sessionId = request.headers.get("x-tartil-session-id");
  const sequence = parseIntegerHeader(request, "x-tartil-sequence");
  const sampleRate = parseIntegerHeader(
    request,
    "x-tartil-sample-rate",
  );
  const startSeconds = parseTimeHeader(
    request,
    "x-tartil-start-seconds",
  );
  const endSeconds = parseTimeHeader(
    request,
    "x-tartil-end-seconds",
  );
  const isFinal = request.headers.get("x-tartil-is-final");

  if (
    !learnerId ||
    learnerId.length > 128 ||
    !sessionId ||
    !/^[A-Za-z0-9._-]{1,128}$/.test(sessionId) ||
    sequence === null ||
    sequence > 1_000_000 ||
    sampleRate === null ||
    sampleRate < MIN_SAMPLE_RATE ||
    sampleRate > MAX_SAMPLE_RATE ||
    startSeconds === null ||
    endSeconds === null ||
    startSeconds < 0 ||
    endSeconds <= startSeconds ||
    endSeconds - startSeconds > MAX_AUDIO_SECONDS ||
    (isFinal !== "true" && isFinal !== "false")
  ) {
    return errorResponse("INVALID_SEGMENT_METADATA", 400);
  }

  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/octet-stream"
  ) {
    return errorResponse("INVALID_AUDIO_CONTENT_TYPE", 415);
  }

  const contentLength = request.headers.get("content-length");

  if (contentLength !== null) {
    const declaredLength = Number(contentLength);

    if (
      !Number.isSafeInteger(declaredLength) ||
      declaredLength <= 0 ||
      declaredLength > MAX_AUDIO_BYTES
    ) {
      return errorResponse("AUDIO_TOO_LARGE_OR_INVALID", 413);
    }
  }

  // Vérifie que le learner appartient réellement à l'utilisateur connecté.
  try {
    await createLearningEngine().assertLearnerAccess(user.id, learnerId);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Learner not found"
    ) {
      return errorResponse("LEARNER_NOT_FOUND", 404);
    }

    console.error(
      "Tartil learner authorization failed:",
      error instanceof Error ? error.constructor.name : "UNKNOWN",
    );

    return errorResponse("LEARNER_AUTHORIZATION_FAILED", 500);
  }

  const payload = await readBoundedBody(request);

  if (!payload) {
    return errorResponse("EMPTY_OR_TOO_LARGE_AUDIO", 413);
  }

  if (payload.byteLength % 4 !== 0) {
    return errorResponse("INVALID_FLOAT32_PCM", 400);
  }

  const frameCount = payload.byteLength / 4;
  const audioDuration = frameCount / sampleRate;

  if (
    audioDuration < 0.25 ||
    audioDuration > MAX_AUDIO_SECONDS
  ) {
    return errorResponse("INVALID_AUDIO_DURATION", 400);
  }

  const token = await readRecognitionToken();
  const serviceUrl = getLocalRecognitionUrl();

  if (!token || !serviceUrl) {
    return errorResponse("RECOGNITION_SERVICE_NOT_CONFIGURED", 503);
  }

  const endpoint = new URL("/v1/recognize", serviceUrl);

  // Un ArrayBuffer indépendant satisfait BodyInit côté Fetch Web.
  // Le Buffer Node reste inchangé pour les validations précédentes.
  const upstreamBody = new ArrayBuffer(payload.byteLength);
  new Uint8Array(upstreamBody).set(payload);

  let upstream: Response;

  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "X-Tilawa-Session-Id": sessionId,
        "X-Tilawa-Sequence": String(sequence),
        "X-Tilawa-Sample-Rate": String(sampleRate),
        "X-Tilawa-Start-Seconds": String(startSeconds),
        "X-Tilawa-End-Seconds": String(endSeconds),
        "X-Tilawa-Is-Final": isFinal,
      },
      body: upstreamBody,
      cache: "no-store",
      signal: AbortSignal.timeout(35_000),
    });
  } catch {
    return errorResponse("RECOGNITION_SERVICE_UNAVAILABLE", 503);
  }

  if (!upstream.ok) {
    console.error(
      "Tartil recognition service returned:",
      upstream.status,
    );

    return errorResponse("RECOGNITION_SERVICE_ERROR", 502);
  }

  const result: unknown = await upstream.json().catch(() => null);

  if (
    typeof result !== "object" ||
    result === null ||
    !("transcription" in result) ||
    typeof result.transcription !== "string" ||
    !("normalizedTranscription" in result) ||
    typeof result.normalizedTranscription !== "string" ||
    !("sequence" in result) ||
    result.sequence !== sequence ||
    !("sessionId" in result) ||
    result.sessionId !== sessionId
  ) {
    return errorResponse("INVALID_RECOGNITION_RESPONSE", 502);
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

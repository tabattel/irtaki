// Validation des entrées des routes d'enregistrement des récitations.
// Module pur (hors readBoundedText, qui n'utilise que les API Web standard).

import type { RecitationMode } from "./tariq-selection";

export const MAX_PART_BYTES = 16 * 1024 * 1024;
export const MAX_PARTS = 200;
export const MIN_AUDIO_BYTES = 3200; // 0,1 s à 16 kHz, 16 bits mono
export const SUPPORTED_SAMPLE_RATE = 16000;
export const MAX_CREATE_BODY_BYTES = 4 * 1024 * 1024;
export const MAX_FINALIZE_BODY_BYTES = 1024;

const SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/;
const EARLIEST_MS = Date.parse("2020-01-01T00:00:00Z");
const DAY_MS = 86_400_000;

export type CreateRecitationBody = {
  clientSessionId: string;
  learnerId: string;
  mode: RecitationMode;
  riwayaId: number;
  tariqId: number | null;
  wajhId: number | null;
  startedAt: Date;
  endedAt: Date | null;
  sampleRate: number;
  timeline: unknown;
};

type Failure = { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function positiveInt(value: unknown, max: number): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= max
    ? value
    : null;
}

function optionalId(
  value: unknown,
): { ok: true; value: number | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  const id = positiveInt(value, 1_000_000);
  return id === null ? { ok: false } : { ok: true, value: id };
}

function parseDate(value: unknown, now: Date): Date | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time < EARLIEST_MS || time > now.getTime() + DAY_MS) {
    return null;
  }
  return new Date(time);
}

export function parseCreateRecitationBody(
  value: unknown,
  now: Date = new Date(),
): { ok: true; data: CreateRecitationBody } | Failure {
  const body = asRecord(value);
  if (!body) return { ok: false, error: "INVALID_BODY" };

  const clientSessionId = body.clientSessionId;
  if (typeof clientSessionId !== "string" || !SESSION_ID.test(clientSessionId)) {
    return { ok: false, error: "INVALID_CLIENT_SESSION_ID" };
  }

  const learnerId = body.learnerId;
  if (typeof learnerId !== "string" || learnerId.length < 1 || learnerId.length > 128) {
    return { ok: false, error: "INVALID_LEARNER_ID" };
  }

  const mode = body.mode;
  if (mode !== "tarteel1" && mode !== "tarteel2") {
    return { ok: false, error: "INVALID_MODE" };
  }

  const riwayaId = positiveInt(body.riwayaId, 1000);
  if (riwayaId === null) return { ok: false, error: "INVALID_RIWAYA_ID" };

  const tariq = optionalId(body.tariqId);
  if (!tariq.ok) return { ok: false, error: "INVALID_TARIQ_ID" };
  const wajh = optionalId(body.wajhId);
  if (!wajh.ok) return { ok: false, error: "INVALID_WAJH_ID" };

  const startedAt = parseDate(body.startedAt, now);
  if (!startedAt) return { ok: false, error: "INVALID_STARTED_AT" };

  let endedAt: Date | null = null;
  if (body.endedAt !== undefined && body.endedAt !== null) {
    endedAt = parseDate(body.endedAt, now);
    if (!endedAt || endedAt.getTime() < startedAt.getTime()) {
      return { ok: false, error: "INVALID_ENDED_AT" };
    }
  }

  if (body.sampleRate !== SUPPORTED_SAMPLE_RATE) {
    return { ok: false, error: "INVALID_SAMPLE_RATE" };
  }

  let timeline: unknown = null;
  if (body.timeline !== undefined && body.timeline !== null) {
    if (typeof body.timeline !== "object") {
      return { ok: false, error: "INVALID_TIMELINE" };
    }
    timeline = body.timeline;
  }

  return {
    ok: true,
    data: {
      clientSessionId,
      learnerId,
      mode,
      riwayaId,
      tariqId: tariq.value,
      wajhId: wajh.value,
      startedAt,
      endedAt,
      sampleRate: SUPPORTED_SAMPLE_RATE,
      timeline,
    },
  };
}

export function parseFinalizeBody(
  value: unknown,
): { ok: true; parts: number; totalBytes: number } | Failure {
  const body = asRecord(value);
  if (!body) return { ok: false, error: "INVALID_BODY" };
  const parts = positiveInt(body.parts, MAX_PARTS);
  if (parts === null) return { ok: false, error: "INVALID_PARTS" };
  const totalBytes = positiveInt(body.totalBytes, 2_000_000_000);
  if (totalBytes === null) return { ok: false, error: "INVALID_TOTAL_BYTES" };
  return { ok: true, parts, totalBytes };
}

// Lecture bornée d'un corps JSON. Lève BODY_TOO_LARGE ou INVALID_BODY.
export async function readBoundedText(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_BODY");

  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks).toString("utf8");
}

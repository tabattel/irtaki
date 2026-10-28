import {
  LearnerPreferenceRepository,
  LearnerRepository,
} from "@irtaki/persistence";
import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";

const KEY_PREFIXES = ["irtaki.mushaf.", "irtaki.audio."];

function isPreferenceKey(key: string): boolean {
  return (
    KEY_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
    !key.includes(".learner.")
  );
}

function normalizePreferences(value: unknown): Record<string, string> {
  const result: Record<string, string> = {};

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }

  for (const [key, item] of Object.entries(value)) {
    if (isPreferenceKey(key) && typeof item === "string") {
      result[key] = item;
    }
  }

  return result;
}

async function verifyOwnedLearner(learnerId: string, userId: string) {
  const repository = new LearnerRepository();
  return repository.findById(learnerId, userId);
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const learnerId = new URL(request.url).searchParams.get("learnerId");

  if (!learnerId || learnerId.length > 128) {
    return Response.json({ error: "INVALID_LEARNER_ID" }, { status: 400 });
  }

  const learner = await verifyOwnedLearner(learnerId, user.id);

  if (!learner) {
    return Response.json({ error: "LEARNER_NOT_FOUND" }, { status: 404 });
  }

  const repository = new LearnerPreferenceRepository();
  const record = await repository.findByLearnerId(learnerId);

  return Response.json({
    preferences: normalizePreferences(record?.preferences),
    updatedAt: record?.updatedAt.toISOString() ?? null,
  });
}

export async function PUT(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "INVALID_PREFERENCES" }, { status: 400 });
  }

  const input = body as {
    learnerId?: unknown;
    preferences?: unknown;
  };

  if (
    typeof input.learnerId !== "string" ||
    input.learnerId.length === 0 ||
    input.learnerId.length > 128 ||
    input.preferences === null ||
    typeof input.preferences !== "object" ||
    Array.isArray(input.preferences)
  ) {
    return Response.json({ error: "INVALID_PREFERENCES" }, { status: 400 });
  }

  const entries = Object.entries(input.preferences as Record<string, unknown>);

  if (entries.length > 300) {
    return Response.json({ error: "TOO_MANY_PREFERENCES" }, { status: 400 });
  }

  let totalLength = 0;
  const preferences: Record<string, string> = {};

  for (const [key, value] of entries) {
    if (
      !isPreferenceKey(key) ||
      key.length > 250 ||
      typeof value !== "string" ||
      value.length > 100_000
    ) {
      return Response.json({ error: "INVALID_PREFERENCES" }, { status: 400 });
    }

    totalLength += key.length + value.length;

    if (totalLength > 500_000) {
      return Response.json({ error: "PREFERENCES_TOO_LARGE" }, { status: 413 });
    }

    preferences[key] = value;
  }

  const learner = await verifyOwnedLearner(input.learnerId, user.id);

  if (!learner) {
    return Response.json({ error: "LEARNER_NOT_FOUND" }, { status: 404 });
  }

  const repository = new LearnerPreferenceRepository();
  const record = await repository.upsert(input.learnerId, preferences);

  return Response.json({
    ok: true,
    updatedAt: record.updatedAt.toISOString(),
  });
}

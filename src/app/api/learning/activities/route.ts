import { NextResponse } from "next/server";

import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";
import { createLearningEngine } from "@/application/learning/learning-engine";

const TASK_ACTIONS = [
  "listen",
  "recite",
  "memorize",
  "revise",
  "tajwid",
  "tadabbur",
  "talkin",
  "tathbit",
  "qiraa",
  "khatma",
  "tahajjud",
] as const;

const FINAL_STATUSES = ["completed", "partial", "failed", "skipped"] as const;

type TaskAction = (typeof TASK_ACTIONS)[number];
type FinalStatus = (typeof FINAL_STATUSES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function respondToError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

  if (message === "Learner not found" || message === "Activity not found") {
    return NextResponse.json(
      { error: message.toUpperCase().replaceAll(" ", "_") },
      { status: 404 },
    );
  }
  if (message === "Activity is already finished") {
    return NextResponse.json(
      { error: "ACTIVITY_ALREADY_FINISHED" },
      { status: 409 },
    );
  }
  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("must be after") ||
    message.startsWith("Ayah not found")
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.error("Learning activity API error:", error);
  return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const parsed: unknown = await request.json().catch(() => null);
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const body = parsed;
    const engine = createLearningEngine();

    if (body.intent === "start" || body.intent === "complete") {
      if (
        typeof body.learnerId !== "string" ||
        body.learnerId.length === 0 ||
        body.learnerId.length > 128 ||
        typeof body.action !== "string" ||
        !TASK_ACTIONS.includes(body.action as TaskAction) ||
        !Array.isArray(body.ayahIds) ||
        body.ayahIds.length === 0 ||
        body.ayahIds.length > 6236 ||
        !body.ayahIds.every(
          (id) => typeof id === "number" && Number.isInteger(id) && id > 0,
        )
      ) {
        return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
      }

      const ayahIds = [...new Set(body.ayahIds as number[])];
      const unknownAyahIds = await engine.findUnknownAyahIds(ayahIds);
      if (unknownAyahIds.length > 0) {
        return NextResponse.json(
          { error: "UNKNOWN_AYAH_IDS", ayahIds: unknownAyahIds },
          { status: 400 },
        );
      }

      const startedAt = new Date();
      const created = await engine.startActivity(user.id, {
        learnerId: body.learnerId,
        action: body.action as TaskAction,
        startedAt,
      });

      const activityId = (created as { id?: unknown } | null)?.id;
      if (typeof activityId !== "string" || activityId.length === 0) {
        throw new Error("Activity creation did not return an id");
      }

      await engine.recordActivityAyahTraces(user.id, {
        learnerId: body.learnerId,
        activityId,
        ayahIds,
      });

      if (body.intent === "complete") {
        await engine.finishActivity(user.id, {
          learnerId: body.learnerId,
          activityId,
          status: "completed",
        });
      }

      return NextResponse.json(
        {
          activityId,
          learnerId: body.learnerId,
          action: body.action,
          ayahIds,
          startedAt: startedAt.toISOString(),
          status: body.intent === "complete" ? "completed" : "started",
        },
        { status: 201 },
      );
    }

    if (body.intent === "finish") {
      if (
        typeof body.learnerId !== "string" ||
        body.learnerId.length === 0 ||
        body.learnerId.length > 128 ||
        typeof body.activityId !== "string" ||
        body.activityId.length === 0 ||
        body.activityId.length > 128 ||
        typeof body.status !== "string" ||
        !FINAL_STATUSES.includes(body.status as FinalStatus)
      ) {
        return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
      }

      const result = await engine.finishActivity(user.id, {
        learnerId: body.learnerId,
        activityId: body.activityId,
        status: body.status as FinalStatus,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "INVALID_INTENT" }, { status: 400 });
  } catch (error) {
    return respondToError(error);
  }
}

import { NextResponse } from "next/server";

import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";
import { createLearningEngine } from "@/application/learning/learning-engine";
import { selectCompatibleProgressGoals } from "@/application/learning/goal-progress-selection";
import { calculatePageFraction } from "@/application/learning/page-line-progress";

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

type ParsedPageLineMetadata = {
  lineNumbersByAyah: Record<string, number[]>;
  pageLineCount: number;
  pageNumber: number;
  fraction: number;
};

function parsePageLineMetadata(
  body: Record<string, unknown>,
  ayahIds: number[],
): { metadata: ParsedPageLineMetadata | null; invalid: boolean } {
  const metadataKeys = [
    "lineNumbersByAyah",
    "pageLineCount",
    "pageNumber",
  ] as const;

  const hasMetadata = metadataKeys.some((key) =>
    Object.prototype.hasOwnProperty.call(body, key),
  );

  // Compatibilité avec les anciens clients qui n'envoient aucun champ.
  if (!hasMetadata) {
    return { metadata: null, invalid: false };
  }

  const rawLineMap = body.lineNumbersByAyah;
  const pageLineCount = body.pageLineCount;
  const pageNumber = body.pageNumber;

  if (
    !isRecord(rawLineMap) ||
    typeof pageLineCount !== "number" ||
    !Number.isInteger(pageLineCount) ||
    pageLineCount < 1 ||
    pageLineCount > 100 ||
    typeof pageNumber !== "number" ||
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > 604
  ) {
    return { metadata: null, invalid: true };
  }

  const expectedKeys = ayahIds.map(String).sort();
  const actualKeys = Object.keys(rawLineMap).sort();

  if (
    ayahIds.length === 0 ||
    actualKeys.length !== expectedKeys.length ||
    !actualKeys.every((key, index) => key === expectedKeys[index])
  ) {
    return { metadata: null, invalid: true };
  }

  const lineNumbersByAyah: Record<string, number[]> = {};

  for (const ayahId of ayahIds) {
    const value = rawLineMap[String(ayahId)];

    if (
      !Array.isArray(value) ||
      value.length === 0 ||
      !value.every(
        (line) =>
          typeof line === "number" &&
          Number.isInteger(line) &&
          line >= 1 &&
          line <= pageLineCount,
      )
    ) {
      return { metadata: null, invalid: true };
    }

    lineNumbersByAyah[String(ayahId)] = [...new Set(value as number[])];
  }

  const fraction = calculatePageFraction(
    lineNumbersByAyah,
    pageLineCount,
  );

  if (fraction === null) {
    return { metadata: null, invalid: true };
  }

  return {
    metadata: {
      lineNumbersByAyah,
      pageLineCount,
      pageNumber,
      fraction,
    },
    invalid: false,
  };
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

      const pageMetadataResult = parsePageLineMetadata(body, ayahIds);

      if (pageMetadataResult.invalid) {
        return NextResponse.json(
          { error: "INVALID_PAGE_LINE_METADATA" },
          { status: 400 },
        );
      }

      const pageMetadata = pageMetadataResult.metadata;
      const pageFraction = pageMetadata?.fraction ?? null;
      const startedAt = new Date();
      const goals = await engine.listGoals(user.id, body.learnerId);
      const compatibleGoals = selectCompatibleProgressGoals(
        goals,
        body.action as TaskAction,
        startedAt,
        pageFraction,
      );

      // L'activité reste unique. Son objectif principal est enregistré
      // dans Activity.goalId ; les objectifs supplémentaires reçoivent
      // chacun leur propre ProgressRecord lors de la finalisation.
      const selectedGoal = compatibleGoals[0] ?? null;

      const created = await engine.startActivity(user.id, {
        learnerId: body.learnerId,
        action: body.action as TaskAction,
        startedAt,
        ...(selectedGoal ? { goalId: selectedGoal.id } : {}),
      });

      const activityId = (created as { id?: unknown } | null)?.id;
      if (typeof activityId !== "string" || activityId.length === 0) {
        throw new Error("Activity creation did not return an id");
      }

      await engine.recordActivityAyahTraces(user.id, {
        learnerId: body.learnerId,
        activityId,
        ayahIds,
        ...(pageMetadata
          ? {
              lineNumbersByAyah: pageMetadata.lineNumbersByAyah,
              pageLineCount: pageMetadata.pageLineCount,
              pageNumber: pageMetadata.pageNumber,
            }
          : {}),
      });

      if (body.intent === "complete") {
        await engine.finishActivity(user.id, {
          learnerId: body.learnerId,
          activityId,
          status: "completed",
        });

        if (selectedGoal) {
          const unit = selectedGoal.unit as "ayah" | "page";
          const quantity =
            unit === "page" ? pageFraction : ayahIds.length;

          if (quantity === null) {
            throw new Error("Page fraction is required for page goal");
          }

          await engine.recordActivityResult(
            body.learnerId,
            {
              activityId,
              status: "completed",
              quantity,
              unit,
            },
            startedAt,
          );
        }

        for (const goal of compatibleGoals) {
          if (goal.id === selectedGoal?.id) continue;

          const unit = goal.unit as "ayah" | "page";
          const quantity =
            unit === "page" ? pageFraction : ayahIds.length;

          if (quantity === null) continue;

          await engine.recordAdditionalGoalProgress(
            user.id,
            body.learnerId,
            goal.id,
            {
              activityId,
              quantity,
              unit,
            },
            startedAt,
          );
        }
      }

      return NextResponse.json(
        {
          activityId,
          learnerId: body.learnerId,
          action: body.action,
          goalId: selectedGoal?.id ?? null,
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

      let finishedAyahIds: number[] = [];

      if (body.ayahIds !== undefined) {
        if (
          !Array.isArray(body.ayahIds) ||
          body.ayahIds.length === 0 ||
          body.ayahIds.length > 6236 ||
          !body.ayahIds.every(
            (id) => typeof id === "number" && Number.isInteger(id) && id > 0,
          )
        ) {
          return NextResponse.json(
            { error: "INVALID_REQUEST" },
            { status: 400 },
          );
        }

        finishedAyahIds = [...new Set(body.ayahIds as number[])];

        const unknownAyahIds =
          await engine.findUnknownAyahIds(finishedAyahIds);

        if (unknownAyahIds.length > 0) {
          return NextResponse.json(
            { error: "UNKNOWN_AYAH_IDS", ayahIds: unknownAyahIds },
            { status: 400 },
          );
        }
      }

      const pageMetadataResult = parsePageLineMetadata(
        body,
        finishedAyahIds,
      );

      if (pageMetadataResult.invalid) {
        return NextResponse.json(
          { error: "INVALID_PAGE_LINE_METADATA" },
          { status: 400 },
        );
      }

      const pageMetadata = pageMetadataResult.metadata;
      const pageFraction = pageMetadata?.fraction ?? null;

      const activityContext =
        finishedAyahIds.length > 0
          ? await engine.getActivityContext(
              user.id,
              body.learnerId,
              body.activityId,
            )
          : null;

      const compatibleGoals = activityContext
        ? selectCompatibleProgressGoals(
            await engine.listGoals(user.id, body.learnerId),
            activityContext.action,
            activityContext.startedAt,
            pageFraction,
          )
        : [];

      const linkedGoal = activityContext?.goal ?? null;

      if (finishedAyahIds.length > 0 && pageMetadata) {
        await engine.recordActivityAyahTraces(user.id, {
          learnerId: body.learnerId,
          activityId: body.activityId,
          ayahIds: finishedAyahIds,
          lineNumbersByAyah: pageMetadata.lineNumbersByAyah,
          pageLineCount: pageMetadata.pageLineCount,
          pageNumber: pageMetadata.pageNumber,
        });
      }

      const result = await engine.finishActivity(user.id, {
        learnerId: body.learnerId,
        activityId: body.activityId,
        status: body.status as FinalStatus,
      });

      if (
        finishedAyahIds.length > 0 &&
        (body.status === "completed" || body.status === "partial")
      ) {
        let recordedLinkedGoalId: string | null = null;
        let linkedUnit: "ayah" | "page" | null = null;

        if (linkedGoal?.unit === "ayah") {
          linkedUnit = "ayah";
        } else if (
          linkedGoal?.unit === "page" &&
          pageFraction !== null
        ) {
          linkedUnit = "page";
        }

        if (linkedGoal && linkedUnit) {
          const quantity =
            linkedUnit === "page" ? pageFraction : finishedAyahIds.length;

          if (quantity !== null) {
            await engine.recordActivityResult(body.learnerId, {
              activityId: body.activityId,
              status: body.status as FinalStatus,
              quantity,
              unit: linkedUnit,
            });

            recordedLinkedGoalId = linkedGoal.id;
          }
        }

        for (const goal of compatibleGoals) {
          if (goal.id === recordedLinkedGoalId) continue;
          if (goal.id === activityContext?.goalId) continue;

          const unit = goal.unit as "ayah" | "page";
          const quantity =
            unit === "page" ? pageFraction : finishedAyahIds.length;

          if (quantity === null) continue;

          await engine.recordAdditionalGoalProgress(
            user.id,
            body.learnerId,
            goal.id,
            {
              activityId: body.activityId,
              quantity,
              unit,
            },
          );
        }
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "INVALID_INTENT" }, { status: 400 });
  } catch (error) {
    return respondToError(error);
  }
}

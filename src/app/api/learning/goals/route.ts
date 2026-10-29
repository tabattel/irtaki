import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";
import { createLearningEngine } from "@/application/learning/learning-engine";

type Engine = ReturnType<typeof createLearningEngine>;
type GoalInput = Parameters<Engine["createGoal"]>[1];

const ALLOWED_ACTIONS = [
  "read", "listen", "recite", "memorize", "revise",
  "tajwid", "tadabbur", "talkin", "tathbit",
  "qiraa", "khatma", "tahajjud",
] as const;

const ALLOWED_UNITS = [
  "quran", "surah", "ayah", "page", "juz",
  "hizb", "nisf", "roboa",
] as const;

const ALLOWED_STATUSES = [
  "draft", "active", "paused", "completed", "cancelled", "archived",
] as const;

const ALLOWED_FREQUENCY_PERIODS = new Set<string>(["day", "week", "month"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

  if (message === "Learner not found") {
    return Response.json({ error: "LEARNER_NOT_FOUND" }, { status: 404 });
  }

  if (/parent goal.*not found/i.test(message)) {
    return Response.json({ error: "PARENT_GOAL_NOT_FOUND" }, { status: 404 });
  }

  if (/goal not found/i.test(message)) {
    return Response.json({ error: "GOAL_NOT_FOUND" }, { status: 404 });
  }

  if (
    /required|invalid|must be|positive|negative|after|range|scope|weekday|notification|date/i.test(
      message,
    )
  ) {
    return Response.json({ error: message }, { status: 400 });
  }

  console.error("Learning goals API error:", error);
  return Response.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
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

  try {
    const engine = createLearningEngine();

    // listGoals vérifie que le profil appartient au compte authentifié.
    const goals = await engine.listGoals(user.id, learnerId);
    const now = new Date();

    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => ({
        ...goal,
        progress: await engine.getProgress(learnerId, goal.id, now),
      })),
    );

    return Response.json({
      learnerId,
      goals: goalsWithProgress,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed: unknown = await request.json().catch(() => null);

  if (!isRecord(parsed)) {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const body = parsed;
  const validEndDate =
    body.endDate === undefined ||
    body.endDate === null ||
    isDateString(body.endDate);

  const validIntervalDays =
    body.intervalDays === undefined ||
    body.intervalDays === null ||
    (typeof body.intervalDays === "number" &&
      Number.isInteger(body.intervalDays) &&
      body.intervalDays > 0);

  const validWeekday =
    body.weekday === undefined ||
    body.weekday === null ||
    (typeof body.weekday === "number" && Number.isInteger(body.weekday));

  const validNotificationEnabled =
    body.notificationEnabled === undefined ||
    typeof body.notificationEnabled === "boolean";

  const validNotificationTime =
    body.notificationTime === undefined ||
    body.notificationTime === null ||
    typeof body.notificationTime === "string";

  if (
    typeof body.learnerId !== "string" ||
    body.learnerId.length === 0 ||
    body.learnerId.length > 128 ||
    typeof body.title !== "string" ||
    body.title.trim().length === 0 ||
    body.title.length > 200 ||
    typeof body.action !== "string" ||
    !ALLOWED_ACTIONS.includes(body.action as (typeof ALLOWED_ACTIONS)[number]) ||
    typeof body.unit !== "string" ||
    !ALLOWED_UNITS.includes(body.unit as (typeof ALLOWED_UNITS)[number]) ||
    typeof body.quantity !== "number" ||
    !Number.isFinite(body.quantity) ||
    body.quantity <= 0 ||
    typeof body.frequencyCount !== "number" ||
    !Number.isInteger(body.frequencyCount) ||
    body.frequencyCount <= 0 ||
    typeof body.frequencyPeriod !== "string" ||
    !ALLOWED_FREQUENCY_PERIODS.has(body.frequencyPeriod) ||
    !isDateString(body.startDate) ||
    !validEndDate ||
    !validIntervalDays ||
    !validWeekday ||
    !validNotificationEnabled ||
    !validNotificationTime ||
    !isOptionalString(body.description) ||
    !isOptionalString(body.parentGoalId) ||
    (body.status !== undefined &&
      (typeof body.status !== "string" ||
        !ALLOWED_STATUSES.includes(
          body.status as (typeof ALLOWED_STATUSES)[number],
        ))) ||
    (body.target !== undefined &&
      body.target !== null &&
      !isRecord(body.target))
  ) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const input = {
    learnerId: body.learnerId,
    parentGoalId:
      typeof body.parentGoalId === "string" ? body.parentGoalId : undefined,
    target:
      body.target === undefined || body.target === null
        ? undefined
        : body.target,
    title: body.title.trim(),
    description:
      typeof body.description === "string" ? body.description : undefined,
    action: body.action,
    quantity: body.quantity,
    unit: body.unit,
    frequencyCount: body.frequencyCount,
    frequencyPeriod: body.frequencyPeriod,
    intervalDays:
      typeof body.intervalDays === "number" ? body.intervalDays : undefined,
    weekday: typeof body.weekday === "number" ? body.weekday : undefined,
    startDate: new Date(body.startDate),
    endDate: isDateString(body.endDate) ? new Date(body.endDate) : undefined,
    status: body.status,
    notificationEnabled: body.notificationEnabled,
    notificationTime:
      typeof body.notificationTime === "string"
        ? body.notificationTime
        : undefined,
  } as GoalInput;

  try {
    const engine = createLearningEngine();

    // createGoal vérifie le profil et l'appartenance du parent éventuel.
    const createdGoal: unknown = await engine.createGoal(user.id, input);

    if (!isRecord(createdGoal) || typeof createdGoal.id !== "string") {
      console.error("Learning goals API: createGoal returned an invalid goal.");
      return Response.json(
        { error: "INTERNAL_SERVER_ERROR" },
        { status: 500 },
      );
    }

    const progress = await engine.getProgress(
      input.learnerId,
      createdGoal.id,
      new Date(),
    );

    return Response.json(
      { goal: createdGoal, progress },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

import { getPeriodEnd, getPeriodStart } from "./goal-scheduler";
import type {
  LearningActivityResultStatus,
  LearningGoal,
  LearningProgress,
  LearningProgressRecord,
} from "./types";

function toNumber(value: string | number): number {
  const result = Number(value);

  if (!Number.isFinite(result)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }

  return result;
}

function contributes(
  status: LearningActivityResultStatus | undefined,
): boolean {
  return status === undefined || status === "completed" || status === "partial";
}

export function calculateProgress(
  goal: LearningGoal,
  records: LearningProgressRecord[],
  now: Date,
): LearningProgress {
  const periodStart = getPeriodStart(goal.frequencyPeriod, now);
  const periodEnd = getPeriodEnd(goal.frequencyPeriod, now);

  const currentRecords = records.filter(
    (record) =>
      record.recordedAt >= periodStart &&
      record.recordedAt <= periodEnd &&
      contributes(record.status),
  );

  const targetQuantity = toNumber(goal.quantity);

  if (targetQuantity <= 0) {
    throw new Error("Goal quantity must be greater than zero");
  }

  if (goal.frequencyCount <= 0) {
    throw new Error("Goal frequencyCount must be greater than zero");
  }

  const achievedQuantity = currentRecords.reduce(
    (sum, record) => sum + toNumber(record.quantity),
    0,
  );

  const achievedActivityCount = currentRecords.length;

  const quantityProgress = Math.min(
    100,
    (achievedQuantity / targetQuantity) * 100,
  );

  const activityProgress = Math.min(
    100,
    (achievedActivityCount / goal.frequencyCount) * 100,
  );

  const progressPercent = Math.min(quantityProgress, activityProgress);

  return {
    periodStart,
    periodEnd,
    targetQuantity,
    achievedQuantity,
    quantityProgress,
    targetActivityCount: goal.frequencyCount,
    achievedActivityCount,
    activityProgress,
    progressPercent,
    remainingQuantity: Math.max(0, targetQuantity - achievedQuantity),
    remainingActivityCount: Math.max(
      0,
      goal.frequencyCount - achievedActivityCount,
    ),
  };
}

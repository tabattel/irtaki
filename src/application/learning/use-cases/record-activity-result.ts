import type {
  LearningActivityResultStatus,
  LearningGoal,
  LearningProgressUnit,
} from "../types";

export type RecordActivityResultInput = {
  activityId: string;
  status: LearningActivityResultStatus;
  quantity: string | number;
  unit: LearningProgressUnit;
};

type ActivityRecord = {
  id: string;
  learnerId: string;
  goalId: string | null;
};

type GoalRecord = LearningGoal & {
  id: string;
};

export type RecordActivityResultDependencies = {
  activityRepository: {
    findById(id: string, learnerId: string): Promise<ActivityRecord | null>;
  };

  goalRepository: {
    findById(id: string, learnerId: string): Promise<GoalRecord | null>;
  };

  activityResultRepository: {
    create(input: RecordActivityResultInput): Promise<unknown>;
  };

  progressRecordRepository: {
    create(input: {
      learnerId: string;
      goalId: string;
      activityId: string;
      recordedAt: Date;
      quantity: string | number;
      unit: LearningProgressUnit;
    }): Promise<unknown>;
  };
};

function validateQuantity(quantity: string | number): void {
  const value = Number(quantity);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Activity result quantity must be zero or greater");
  }
}

export async function recordActivityResult(
  learnerId: string,
  input: RecordActivityResultInput,
  dependencies: RecordActivityResultDependencies,
  recordedAt = new Date(),
): Promise<{
  activityResult: unknown;
  progressRecord: unknown | null;
}> {
  if (learnerId.trim().length === 0) {
    throw new Error("Learner id is required");
  }

  if (input.activityId.trim().length === 0) {
    throw new Error("Activity id is required");
  }

  validateQuantity(input.quantity);

  const activity = await dependencies.activityRepository.findById(
    input.activityId,
    learnerId,
  );

  if (activity === null) {
    throw new Error("Activity not found");
  }

  if (activity.goalId === null) {
    throw new Error("Activity must be linked to a goal");
  }

  const goal = await dependencies.goalRepository.findById(
    activity.goalId,
    learnerId,
  );

  if (goal === null) {
    throw new Error("Goal not found");
  }

  if (input.unit !== goal.unit) {
    throw new Error("Activity result unit does not match goal unit");
  }

  const activityResult =
    await dependencies.activityResultRepository.create(input);

  if (input.status !== "completed" && input.status !== "partial") {
    return {
      activityResult,
      progressRecord: null,
    };
  }

  const progressRecord = await dependencies.progressRecordRepository.create({
    learnerId,
    goalId: goal.id,
    activityId: activity.id,
    recordedAt,
    quantity: input.quantity,
    unit: input.unit,
  });

  return {
    activityResult,
    progressRecord,
  };
}

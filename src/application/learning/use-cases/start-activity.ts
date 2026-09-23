import { isGoalActiveAt } from "../goal-scheduler";
import type { LearningGoal, LearningGoalStatus } from "../types";

export type StartActivityInput = {
  learnerId: string;
  goalId?: string;
  action: LearningGoal["action"];
  startedAt: Date;
  endedAt?: Date;
  durationSec?: number;
  notes?: string;
};

type GoalRecord = LearningGoal & {
  action: LearningGoal["action"];
};

export type StartActivityDependencies = {
  learnerRepository: {
    findById(id: string, userId: string): Promise<unknown | null>;
  };

  goalRepository: {
    findById(id: string, learnerId: string): Promise<GoalRecord | null>;
  };

  activityRepository: {
    create(input: StartActivityInput): Promise<unknown>;
  };
};

function validateDates(startedAt: Date, endedAt: Date | undefined): void {
  if (Number.isNaN(startedAt.getTime())) {
    throw new Error("Activity startedAt is invalid");
  }

  if (
    endedAt !== undefined &&
    (Number.isNaN(endedAt.getTime()) || endedAt < startedAt)
  ) {
    throw new Error("Activity endedAt must be after startedAt");
  }
}

function validateDuration(durationSec: number | undefined): void {
  if (
    durationSec !== undefined &&
    (!Number.isInteger(durationSec) || durationSec < 0)
  ) {
    throw new Error("Activity durationSec must be zero or greater");
  }
}

export async function startActivity(
  userId: string,
  input: StartActivityInput,
  dependencies: StartActivityDependencies,
): Promise<unknown> {
  if (input.learnerId.trim().length === 0) {
    throw new Error("Learner id is required");
  }

  validateDates(input.startedAt, input.endedAt);
  validateDuration(input.durationSec);

  const learner = await dependencies.learnerRepository.findById(
    input.learnerId,
    userId,
  );

  if (learner === null) {
    throw new Error("Learner not found");
  }

  if (input.goalId === undefined) {
    return dependencies.activityRepository.create(input);
  }

  const goal = await dependencies.goalRepository.findById(
    input.goalId,
    input.learnerId,
  );

  if (goal === null) {
    throw new Error("Goal not found");
  }

  if (!isGoalActiveAt(goal, input.startedAt)) {
    throw new Error("Goal is not active");
  }

  if (goal.action !== input.action) {
    throw new Error("Activity action does not match goal action");
  }

  return dependencies.activityRepository.create(input);
}

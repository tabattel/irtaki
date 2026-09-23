import { calculateProgress } from "../progress-calculator";
import type {
  LearningGoal,
  LearningProgress,
  LearningProgressRecord,
} from "../types";

export type GetProgressDependencies = {
  goalRepository: {
    findById(id: string, learnerId: string): Promise<LearningGoal | null>;
  };

  progressRecordRepository: {
    findManyByGoalId(
      goalId: string,
      learnerId: string,
    ): Promise<
      Array<{
        recordedAt: Date;
        quantity: string | number;
      }>
    >;
  };
};

export async function getProgress(
  learnerId: string,
  goalId: string,
  now: Date,
  dependencies: GetProgressDependencies,
): Promise<LearningProgress> {
  if (learnerId.trim().length === 0) {
    throw new Error("Learner id is required");
  }

  if (goalId.trim().length === 0) {
    throw new Error("Goal id is required");
  }

  const goal = await dependencies.goalRepository.findById(goalId, learnerId);

  if (goal === null) {
    throw new Error("Goal not found");
  }

  const records = await dependencies.progressRecordRepository.findManyByGoalId(
    goalId,
    learnerId,
  );

  const progressRecords: LearningProgressRecord[] = records.map((record) => ({
    recordedAt: record.recordedAt,
    quantity: record.quantity,
  }));

  return calculateProgress(goal, progressRecords, now);
}

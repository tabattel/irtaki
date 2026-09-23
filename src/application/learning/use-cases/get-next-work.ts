import { resolveNextWork } from "../next-work-resolver";
import type { LearningGoal, LearningProgressRecord, NextWork } from "../types";

export type GetNextWorkDependencies = {
  goalRepository: {
    findManyByLearnerId(learnerId: string): Promise<LearningGoal[]>;
  };

  progressRecordRepository: {
    findManyByLearnerId(learnerId: string): Promise<
      Array<{
        goalId: string | null;
        recordedAt: Date;
        quantity: string | number;
      }>
    >;
  };
};

export async function getNextWork(
  learnerId: string,
  now: Date,
  dependencies: GetNextWorkDependencies,
): Promise<NextWork[]> {
  if (learnerId.trim().length === 0) {
    throw new Error("Learner id is required");
  }

  const goals =
    await dependencies.goalRepository.findManyByLearnerId(learnerId);

  const records =
    await dependencies.progressRecordRepository.findManyByLearnerId(learnerId);

  const recordsByGoalId = new Map<string, LearningProgressRecord[]>();

  for (const record of records) {
    if (record.goalId === null) {
      continue;
    }

    const goalRecords = recordsByGoalId.get(record.goalId) ?? [];

    goalRecords.push({
      recordedAt: record.recordedAt,
      quantity: record.quantity,
    });

    recordsByGoalId.set(record.goalId, goalRecords);
  }

  return resolveNextWork(goals, recordsByGoalId, now);
}

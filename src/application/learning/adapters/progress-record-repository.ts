import type { ProgressRecordRepository } from "@irtaki/persistence";
import type { LearningProgressRecord } from "../types";

type PersistenceProgressRecord = Awaited<
  ReturnType<ProgressRecordRepository["findManyByGoalId"]>
>[number];

function mapProgressRecord(
  record: PersistenceProgressRecord,
): LearningProgressRecord {
  return {
    recordedAt: record.recordedAt,
    quantity: record.quantity.toString(),
  };
}

export function createLearningProgressRecordRepository(
  repository: ProgressRecordRepository,
) {
  return {
    async create(input: Parameters<ProgressRecordRepository["create"]>[0]) {
      return repository.create(input);
    },

    async findManyByGoalId(
      goalId: string,
      learnerId: string,
    ): Promise<LearningProgressRecord[]> {
      const records = await repository.findManyByGoalId(goalId, learnerId);

      return records.map(mapProgressRecord);
    },

    async findManyByLearnerId(learnerId: string): Promise<
      Array<{
        goalId: string | null;
        recordedAt: Date;
        quantity: string;
      }>
    > {
      const records = await repository.findManyByLearnerId(learnerId);

      return records.map(
        (
          record: Awaited<
            ReturnType<ProgressRecordRepository["findManyByLearnerId"]>
          >[number],
        ) => ({
          goalId: record.goalId,
          recordedAt: record.recordedAt,
          quantity: record.quantity.toString(),
        }),
      );
    },
  };
}

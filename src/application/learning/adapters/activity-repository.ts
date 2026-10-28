import type { ActivityRepository } from "@irtaki/persistence";
import type { LearningGoalAction } from "../types";

export function createLearningActivityRepository(
  repository: ActivityRepository,
) {
  return {
    async create(input: {
      learnerId: string;
      goalId?: string;
      action: LearningGoalAction;
      startedAt: Date;
      endedAt?: Date;
      durationSec?: number;
      notes?: string;
    }): Promise<unknown> {
      return repository.create(input);
    },

    async findById(id: string, learnerId: string) {
      return repository.findById(id, learnerId);
    },

    async update(
      id: string,
      learnerId: string,
      input: { endedAt?: Date | null; durationSec?: number | null },
    ) {
      return repository.update(id, learnerId, input);
    },
  };
}

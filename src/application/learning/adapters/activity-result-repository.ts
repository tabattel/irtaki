import type { ActivityResultRepository } from "@irtaki/persistence";
import type {
  LearningActivityResultStatus,
  LearningProgressUnit,
} from "../types";

export function createLearningActivityResultRepository(
  repository: ActivityResultRepository,
) {
  return {
    async create(input: {
      activityId: string;
      status: LearningActivityResultStatus;
      quantity: string | number;
      unit: LearningProgressUnit;
    }): Promise<unknown> {
      return repository.create(input);
    },
    async createWithProgress(
      input: {
        activityId: string;
        status: LearningActivityResultStatus;
        quantity: string | number;
        unit: LearningProgressUnit;
      },
      progressInput: {
        learnerId: string;
        goalId: string;
        activityId: string;
        recordedAt: Date;
        quantity: string | number;
        unit: LearningProgressUnit;
      },
    ): Promise<{ activityResult: unknown; progressRecord: unknown }> {
      return repository.createWithProgress(input, progressInput);
    },
  };
}

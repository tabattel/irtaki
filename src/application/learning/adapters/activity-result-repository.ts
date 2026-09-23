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
  };
}

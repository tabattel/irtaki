import type { LearnerRepository } from "@irtaki/persistence";

export function createLearningLearnerRepository(repository: LearnerRepository) {
  return {
    async findById(id: string, userId: string): Promise<unknown | null> {
      return repository.findById(id, userId);
    },
  };
}

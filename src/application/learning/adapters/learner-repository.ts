import type { LearnerRepository } from "@irtaki/persistence";

export function createLearningLearnerRepository(repository: LearnerRepository) {
  return {
    async findById(id: string, userId: string): Promise<unknown | null> {
      return repository.findById(id, userId);
    },

    async findManyByUserId(userId: string): Promise<
      Array<{
        id: string;
        name: string | null;
        childProfileId: string | null;
      }>
    > {
      return repository.findManyByUserId(userId);
    },
  };
}

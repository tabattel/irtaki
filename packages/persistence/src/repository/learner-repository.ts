import { prisma } from "../client/prisma";

export type LearnerRecord = {
  id: string;
  userId: string;
  childProfileId: string | null;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class LearnerRepository {
  async create(input: {
    userId: string;
    childProfileId?: string;
    name?: string;
  }): Promise<LearnerRecord> {
    return prisma.learner.create({
      data: {
        userId: input.userId,
        childProfileId: input.childProfileId,
        name: input.name,
      },
    });
  }

  async findById(id: string, userId: string): Promise<LearnerRecord | null> {
    return prisma.learner.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  async findManyByUserId(userId: string): Promise<LearnerRecord[]> {
    return prisma.learner.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async findByChildProfileId(
    childProfileId: string,
    userId: string,
  ): Promise<LearnerRecord | null> {
    return prisma.learner.findFirst({
      where: {
        childProfileId,
        userId,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    input: {
      name?: string | null;
    },
  ): Promise<LearnerRecord> {
    return prisma.learner.update({
      where: {
        id,
        userId,
      },
      data: {
        name: input.name,
      },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    await prisma.learner.delete({
      where: {
        id,
        userId,
      },
    });
  }
}

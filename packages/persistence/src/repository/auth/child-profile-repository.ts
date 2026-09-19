import { prisma } from "../../client/prisma";

export type ChildProfileRecord = {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export class ChildProfileRepository {
  async create(input: {
    userId: string;
    name: string;
  }): Promise<ChildProfileRecord> {
    return prisma.childProfile.create({
      data: {
        userId: input.userId,
        name: input.name,
      },
    });
  }

  async findById(
    id: string,
    userId: string,
  ): Promise<ChildProfileRecord | null> {
    return prisma.childProfile.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  async findManyByUserId(userId: string): Promise<ChildProfileRecord[]> {
    return prisma.childProfile.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async update(
    id: string,
    userId: string,
    input: {
      name: string;
    },
  ): Promise<ChildProfileRecord> {
    return prisma.childProfile.update({
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
    await prisma.childProfile.delete({
      where: {
        id,
        userId,
      },
    });
  }
}

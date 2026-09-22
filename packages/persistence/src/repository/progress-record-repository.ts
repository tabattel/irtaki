import { prisma } from "../client/prisma";
import type { ProgressRecord } from "../generated/client";

export class ProgressRecordRepository {
  async create(input: {
    learnerId: string;
    goalId?: string;
    activityId?: string;
    recordedAt?: Date;
    quantity: string | number;
    unit:
      "quran" | "surah" | "ayah" | "page" | "juz" | "hizb" | "nisf" | "roboa";
  }): Promise<ProgressRecord> {
    return prisma.progressRecord.create({
      data: {
        learnerId: input.learnerId,
        goalId: input.goalId,
        activityId: input.activityId,
        recordedAt: input.recordedAt,
        quantity: input.quantity,
        unit: input.unit,
      },
    });
  }

  async findById(
    id: string,
    learnerId: string,
  ): Promise<ProgressRecord | null> {
    return prisma.progressRecord.findFirst({
      where: {
        id,
        learnerId,
      },
    });
  }

  async findManyByLearnerId(learnerId: string): Promise<ProgressRecord[]> {
    return prisma.progressRecord.findMany({
      where: {
        learnerId,
      },
      orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    });
  }

  async findManyByGoalId(
    goalId: string,
    learnerId: string,
  ): Promise<ProgressRecord[]> {
    return prisma.progressRecord.findMany({
      where: {
        goalId,
        learnerId,
      },
      orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    });
  }

  async findManyByActivityId(
    activityId: string,
    learnerId: string,
  ): Promise<ProgressRecord[]> {
    return prisma.progressRecord.findMany({
      where: {
        activityId,
        learnerId,
      },
      orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    });
  }
}

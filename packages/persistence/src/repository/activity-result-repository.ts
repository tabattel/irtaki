import { prisma } from "../client/prisma";
import type { ActivityResult, ProgressRecord } from "../generated/client";

export class ActivityResultRepository {
  async create(input: {
    activityId: string;
    status: "completed" | "partial" | "failed" | "skipped";
    quantity: string | number;
    unit:
      "quran" | "surah" | "ayah" | "page" | "juz" | "hizb" | "nisf" | "roboa";
  }): Promise<ActivityResult> {
    return prisma.activityResult.create({
      data: {
        activityId: input.activityId,
        status: input.status,
        quantity: input.quantity,
        unit: input.unit,
      },
    });
  }

  async createWithProgress(
    input: {
      activityId: string;
      status: "completed" | "partial" | "failed" | "skipped";
      quantity: string | number;
      unit: "quran" | "surah" | "ayah" | "page" | "juz" | "hizb" | "nisf" | "roboa";
    },
    progressInput: {
      learnerId: string;
      goalId: string;
      activityId: string;
      recordedAt: Date;
      quantity: string | number;
      unit: "quran" | "surah" | "ayah" | "page" | "juz" | "hizb" | "nisf" | "roboa";
    },
  ): Promise<{ activityResult: ActivityResult; progressRecord: ProgressRecord }> {
    return prisma.$transaction(async (transaction) => {
      const activityResult = await transaction.activityResult.create({
        data: {
          activityId: input.activityId,
          status: input.status,
          quantity: input.quantity,
          unit: input.unit,
        },
      });

      const progressRecord = await transaction.progressRecord.create({
        data: {
          learnerId: progressInput.learnerId,
          goalId: progressInput.goalId,
          activityId: progressInput.activityId,
          recordedAt: progressInput.recordedAt,
          quantity: progressInput.quantity,
          unit: progressInput.unit,
        },
      });

      return { activityResult, progressRecord };
    });
  }

  async findByActivityId(activityId: string): Promise<ActivityResult | null> {
    return prisma.activityResult.findUnique({
      where: {
        activityId,
      },
    });
  }

  async update(
    activityId: string,
    input: {
      status?: "completed" | "partial" | "failed" | "skipped";
      quantity?: string | number;
      unit?:
        "quran" | "surah" | "ayah" | "page" | "juz" | "hizb" | "nisf" | "roboa";
    },
  ): Promise<ActivityResult> {
    return prisma.activityResult.update({
      where: {
        activityId,
      },
      data: input,
    });
  }

  async delete(activityId: string): Promise<void> {
    await prisma.activityResult.delete({
      where: {
        activityId,
      },
    });
  }
}

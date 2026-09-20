import { prisma } from "../client/prisma";
import type { ActivityResult } from "../generated/client";

export class ActivityResultRepository {
  async create(input: {
    activityId: string;
    status: "completed" | "partial" | "failed" | "skipped";
    quantity: string | number;
    unit:
      | "quran"
      | "surah"
      | "ayah"
      | "page"
      | "juz"
      | "hizb";
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

  async findByActivityId(
    activityId: string,
  ): Promise<ActivityResult | null> {
    return prisma.activityResult.findUnique({
      where: {
        activityId,
      },
    });
  }

  async update(
    activityId: string,
    input: {
      status?:
        | "completed"
        | "partial"
        | "failed"
        | "skipped";
      quantity?: string | number;
      unit?:
        | "quran"
        | "surah"
        | "ayah"
        | "page"
        | "juz"
        | "hizb";
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

import { prisma } from "../client/prisma";
import type { GoalTarget } from "../generated/client";

export class GoalTargetRepository {
  async create(input: {
    goalId: string;
    scope:
      | "quran"
      | "surah"
      | "juz"
      | "hizb"
      | "nisf"
      | "roboa"
      | "page"
      | "page_range"
      | "ayah"
      | "ayah_range";
    startValue?: string;
    endValue?: string;
  }): Promise<GoalTarget> {
    return prisma.goalTarget.create({
      data: {
        goalId: input.goalId,
        scope: input.scope,
        startValue: input.startValue,
        endValue: input.endValue,
      },
    });
  }

  async findByGoalId(goalId: string): Promise<GoalTarget | null> {
    return prisma.goalTarget.findUnique({
      where: {
        goalId,
      },
    });
  }

  async update(
    goalId: string,
    input: {
      scope?:
        | "quran"
        | "surah"
        | "juz"
        | "hizb"
        | "nisf"
        | "roboa"
        | "page"
        | "page_range"
        | "ayah"
        | "ayah_range";
      startValue?: string | null;
      endValue?: string | null;
    },
  ): Promise<GoalTarget> {
    return prisma.goalTarget.update({
      where: {
        goalId,
      },
      data: {
        scope: input.scope,
        startValue: input.startValue,
        endValue: input.endValue,
      },
    });
  }

  async delete(goalId: string): Promise<void> {
    await prisma.goalTarget.delete({
      where: {
        goalId,
      },
    });
  }
}

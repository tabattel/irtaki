import { prisma } from "../client/prisma";
import type { Goal } from "../generated/client";

export class GoalRepository {
  async create(input: {
    learnerId: string;
    parentGoalId?: string;
    title: string;
    description?: string;
    action:
      | "read"
      | "listen"
      | "recite"
      | "memorize"
      | "revise"
      | "tajwid"
      | "tadabbur"
      | "talkin"
      | "tathbit";
    quantity: string | number;
    unit:
      | "quran"
      | "surah"
      | "ayah"
      | "page"
      | "juz"
      | "hizb";
    frequencyCount: number;
    frequencyPeriod: "day" | "week" | "month";
    intervalDays?: number;
    weekday?:
      | "monday"
      | "tuesday"
      | "wednesday"
      | "thursday"
      | "friday"
      | "saturday"
      | "sunday";
    startDate: Date;
    endDate?: Date;
    status?:
      | "draft"
      | "active"
      | "paused"
      | "completed"
      | "cancelled"
      | "archived";
    notificationEnabled?: boolean;
    notificationTime?: string;
  }): Promise<Goal> {
    return prisma.goal.create({
      data: {
        learnerId: input.learnerId,
        parentGoalId: input.parentGoalId,
        title: input.title,
        description: input.description,
        action: input.action,
        quantity: input.quantity,
        unit: input.unit,
        frequencyCount: input.frequencyCount,
        frequencyPeriod: input.frequencyPeriod,
        intervalDays: input.intervalDays,
        weekday: input.weekday,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status,
        notificationEnabled: input.notificationEnabled,
        notificationTime: input.notificationTime,
      },
    });
  }

  async findById(
    id: string,
    learnerId: string,
  ): Promise<Goal | null> {
    return prisma.goal.findFirst({
      where: {
        id,
        learnerId,
      },
    });
  }

  async findManyByLearnerId(learnerId: string): Promise<Goal[]> {
    return prisma.goal.findMany({
      where: {
        learnerId,
      },
      orderBy: [
        { startDate: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  async findMainGoalsByLearnerId(learnerId: string): Promise<Goal[]> {
    return prisma.goal.findMany({
      where: {
        learnerId,
        parentGoalId: null,
      },
      orderBy: [
        { startDate: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  async findSubGoals(parentGoalId: string): Promise<Goal[]> {
    return prisma.goal.findMany({
      where: {
        parentGoalId,
      },
      orderBy: [
        { startDate: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  async update(
    id: string,
    learnerId: string,
    input: {
      title?: string;
      description?: string | null;
      action?:
        | "read"
        | "listen"
        | "recite"
        | "memorize"
        | "revise"
        | "tajwid"
        | "tadabbur"
        | "talkin"
        | "tathbit";
      quantity?: string | number;
      unit?:
        | "quran"
        | "surah"
        | "ayah"
        | "page"
        | "juz"
        | "hizb";
      frequencyCount?: number;
      frequencyPeriod?: "day" | "week" | "month";
      intervalDays?: number | null;
      weekday?:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
        | null;
      startDate?: Date;
      endDate?: Date | null;
      status?:
        | "draft"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
        | "archived";
      notificationEnabled?: boolean;
      notificationTime?: string | null;
    },
  ): Promise<Goal> {
    return prisma.goal.updateMany({
      where: {
        id,
        learnerId,
      },
      data: input,
    }).then(async (result) => {
      if (result.count === 0) {
        throw new Error("Goal not found");
      }

      return prisma.goal.findFirstOrThrow({
        where: {
          id,
          learnerId,
        },
      });
    });
  }

  async delete(id: string, learnerId: string): Promise<void> {
    await prisma.goal.deleteMany({
      where: {
        id,
        learnerId,
      },
    });
  }
}

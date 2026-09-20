import { prisma } from "../client/prisma";
import type { Activity } from "../generated/client";

export class ActivityRepository {
  async create(input: {
    learnerId: string;
    goalId?: string;
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
    startedAt: Date;
    endedAt?: Date;
    durationSec?: number;
    notes?: string;
  }): Promise<Activity> {
    return prisma.activity.create({
      data: {
        learnerId: input.learnerId,
        goalId: input.goalId,
        action: input.action,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        durationSec: input.durationSec,
        notes: input.notes,
      },
    });
  }

  async findById(
    id: string,
    learnerId: string,
  ): Promise<Activity | null> {
    return prisma.activity.findFirst({
      where: {
        id,
        learnerId,
      },
    });
  }

  async findManyByLearnerId(
    learnerId: string,
  ): Promise<Activity[]> {
    return prisma.activity.findMany({
      where: {
        learnerId,
      },
      orderBy: [
        { startedAt: "desc" },
        { id: "desc" },
      ],
    });
  }

  async findManyByGoalId(
    goalId: string,
    learnerId: string,
  ): Promise<Activity[]> {
    return prisma.activity.findMany({
      where: {
        goalId,
        learnerId,
      },
      orderBy: [
        { startedAt: "desc" },
        { id: "desc" },
      ],
    });
  }

  async update(
    id: string,
    learnerId: string,
    input: {
      goalId?: string | null;
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
      startedAt?: Date;
      endedAt?: Date | null;
      durationSec?: number | null;
      notes?: string | null;
    },
  ): Promise<Activity> {
    return prisma.activity.updateMany({
      where: {
        id,
        learnerId,
      },
      data: input,
    }).then(async (result) => {
      if (result.count === 0) {
        throw new Error("Activity not found");
      }

      return prisma.activity.findFirstOrThrow({
        where: {
          id,
          learnerId,
        },
      });
    });
  }

  async delete(
    id: string,
    learnerId: string,
  ): Promise<void> {
    await prisma.activity.deleteMany({
      where: {
        id,
        learnerId,
      },
    });
  }
}

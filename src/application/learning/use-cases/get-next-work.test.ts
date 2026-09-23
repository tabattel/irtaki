import { describe, expect, it, vi } from "vitest";
import { getNextWork, type GetNextWorkDependencies } from "./get-next-work";

const now = new Date("2026-09-23T12:00:00.000Z");

function createGoal(id: string, title: string, quantity: number) {
  return {
    id,
    title,
    action: "memorize" as const,
    quantity,
    unit: "page" as const,
    frequencyCount: 2,
    frequencyPeriod: "week" as const,
    intervalDays: null,
    weekday: null,
    startDate: new Date("2026-09-21T00:00:00.000Z"),
    endDate: null,
    status: "active" as const,
  };
}

function createDependencies(): GetNextWorkDependencies {
  return {
    goalRepository: {
      findManyByLearnerId: vi
        .fn()
        .mockResolvedValue([
          createGoal("goal-1", "Mémoriser 10 pages", 10),
          createGoal("goal-2", "Mémoriser 5 pages", 5),
        ]),
    },
    progressRecordRepository: {
      findManyByLearnerId: vi.fn().mockResolvedValue([
        {
          goalId: "goal-1",
          recordedAt: new Date("2026-09-23T10:00:00.000Z"),
          quantity: 5,
        },
        {
          goalId: null,
          recordedAt: new Date("2026-09-23T11:00:00.000Z"),
          quantity: 20,
        },
      ]),
    },
  };
}

describe("getNextWork", () => {
  it("retourne le travail restant des objectifs actifs", async () => {
    const dependencies = createDependencies();

    const result = await getNextWork("learner-1", now, dependencies);

    expect(result).toEqual([
      {
        goalId: "goal-2",
        title: "Mémoriser 5 pages",
        quantity: 5,
        unit: "page",
        activityCount: 2,
        reason: "not_started",
      },
      {
        goalId: "goal-1",
        title: "Mémoriser 10 pages",
        quantity: 5,
        unit: "page",
        activityCount: 1,
        reason: "in_progress",
      },
    ]);
  });

  it("regroupe les progress records par objectif", async () => {
    const dependencies = createDependencies();

    dependencies.progressRecordRepository.findManyByLearnerId = vi
      .fn()
      .mockResolvedValue([
        {
          goalId: "goal-1",
          recordedAt: new Date("2026-09-22T10:00:00.000Z"),
          quantity: 2,
        },
        {
          goalId: "goal-1",
          recordedAt: new Date("2026-09-23T10:00:00.000Z"),
          quantity: 3,
        },
        {
          goalId: "goal-2",
          recordedAt: new Date("2026-09-23T11:00:00.000Z"),
          quantity: 1,
        },
      ]);

    const result = await getNextWork("learner-1", now, dependencies);

    expect(result[0]).toMatchObject({
      goalId: "goal-2",
      quantity: 4,
    });

    expect(result[1]).toMatchObject({
      goalId: "goal-1",
      quantity: 5,
    });
  });

  it("ne fait qu'une lecture des objectifs et des progress records", async () => {
    const dependencies = createDependencies();

    await getNextWork("learner-1", now, dependencies);

    expect(
      dependencies.goalRepository.findManyByLearnerId,
    ).toHaveBeenCalledTimes(1);

    expect(
      dependencies.progressRecordRepository.findManyByLearnerId,
    ).toHaveBeenCalledTimes(1);
  });

  it("refuse un learner vide", async () => {
    const dependencies = createDependencies();

    await expect(getNextWork("", now, dependencies)).rejects.toThrow(
      "Learner id is required",
    );

    expect(
      dependencies.goalRepository.findManyByLearnerId,
    ).not.toHaveBeenCalled();
  });

  it("exclut les objectifs déjà atteints", async () => {
    const dependencies = createDependencies();

    dependencies.progressRecordRepository.findManyByLearnerId = vi
      .fn()
      .mockResolvedValue([
        {
          goalId: "goal-1",
          recordedAt: new Date("2026-09-22T10:00:00.000Z"),
          quantity: 5,
        },
        {
          goalId: "goal-1",
          recordedAt: new Date("2026-09-23T10:00:00.000Z"),
          quantity: 5,
        },
        {
          goalId: "goal-2",
          recordedAt: new Date("2026-09-22T10:00:00.000Z"),
          quantity: 2,
        },
        {
          goalId: "goal-2",
          recordedAt: new Date("2026-09-23T10:00:00.000Z"),
          quantity: 3,
        },
      ]);

    const result = await getNextWork("learner-1", now, dependencies);

    expect(result).toEqual([]);
  });
});

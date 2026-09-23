import { describe, expect, it, vi } from "vitest";
import { getProgress, type GetProgressDependencies } from "./get-progress";

const now = new Date("2026-09-23T12:00:00.000Z");

const goal = {
  id: "goal-1",
  title: "Mémoriser 10 pages",
  action: "memorize" as const,
  quantity: 10,
  unit: "page" as const,
  frequencyCount: 2,
  frequencyPeriod: "week" as const,
  intervalDays: null,
  weekday: null,
  startDate: new Date("2026-09-21T00:00:00.000Z"),
  endDate: null,
  status: "active" as const,
};

function createDependencies(): GetProgressDependencies {
  return {
    goalRepository: {
      findById: vi.fn().mockResolvedValue(goal),
    },
    progressRecordRepository: {
      findManyByGoalId: vi.fn().mockResolvedValue([
        {
          recordedAt: new Date("2026-09-22T10:00:00.000Z"),
          quantity: 3,
        },
        {
          recordedAt: new Date("2026-09-23T10:00:00.000Z"),
          quantity: 2,
        },
      ]),
    },
  };
}

describe("getProgress", () => {
  it("calcule la progression de l'objectif", async () => {
    const dependencies = createDependencies();

    const result = await getProgress("learner-1", "goal-1", now, dependencies);

    expect(result.targetQuantity).toBe(10);
    expect(result.achievedQuantity).toBe(5);
    expect(result.achievedActivityCount).toBe(2);
    expect(result.remainingQuantity).toBe(5);
    expect(result.remainingActivityCount).toBe(0);
    expect(result.progressPercent).toBe(50);
  });

  it("transmet l'identité du learner au repository", async () => {
    const dependencies = createDependencies();

    await getProgress("learner-1", "goal-1", now, dependencies);

    expect(dependencies.goalRepository.findById).toHaveBeenCalledWith(
      "goal-1",
      "learner-1",
    );

    expect(
      dependencies.progressRecordRepository.findManyByGoalId,
    ).toHaveBeenCalledWith("goal-1", "learner-1");
  });

  it("ignore les enregistrements hors de la période courante", async () => {
    const dependencies = createDependencies();

    dependencies.progressRecordRepository.findManyByGoalId = vi
      .fn()
      .mockResolvedValue([
        {
          recordedAt: new Date("2026-09-15T10:00:00.000Z"),
          quantity: 9,
        },
        {
          recordedAt: new Date("2026-09-23T10:00:00.000Z"),
          quantity: 2,
        },
      ]);

    const result = await getProgress("learner-1", "goal-1", now, dependencies);

    expect(result.achievedQuantity).toBe(2);
    expect(result.achievedActivityCount).toBe(1);
  });

  it("refuse un learner vide", async () => {
    const dependencies = createDependencies();

    await expect(getProgress("", "goal-1", now, dependencies)).rejects.toThrow(
      "Learner id is required",
    );
  });

  it("refuse un goal vide", async () => {
    const dependencies = createDependencies();

    await expect(
      getProgress("learner-1", "", now, dependencies),
    ).rejects.toThrow("Goal id is required");
  });

  it("refuse un objectif inexistant", async () => {
    const dependencies = createDependencies();

    dependencies.goalRepository.findById = vi.fn().mockResolvedValue(null);

    await expect(
      getProgress("learner-1", "goal-1", now, dependencies),
    ).rejects.toThrow("Goal not found");

    expect(
      dependencies.progressRecordRepository.findManyByGoalId,
    ).not.toHaveBeenCalled();
  });
});

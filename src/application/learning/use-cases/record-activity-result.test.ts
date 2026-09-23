import { describe, expect, it, vi } from "vitest";
import {
  recordActivityResult,
  type RecordActivityResultInput,
} from "./record-activity-result";

const recordedAt = new Date("2026-09-23T12:00:00.000Z");

const baseInput: RecordActivityResultInput = {
  activityId: "activity-1",
  status: "completed",
  quantity: 2,
  unit: "page",
};

function createGoal() {
  return {
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
}

function createDependencies() {
  return {
    activityRepository: {
      findById: vi.fn().mockResolvedValue({
        id: "activity-1",
        learnerId: "learner-1",
        goalId: "goal-1",
      }),
    },
    goalRepository: {
      findById: vi.fn().mockResolvedValue(createGoal()),
    },
    activityResultRepository: {
      create: vi.fn().mockResolvedValue({
        id: "result-1",
        ...baseInput,
      }),
    },
    progressRecordRepository: {
      create: vi.fn().mockResolvedValue({
        id: "progress-1",
        learnerId: "learner-1",
        goalId: "goal-1",
        activityId: "activity-1",
        recordedAt,
        quantity: 2,
        unit: "page",
      }),
    },
  };
}

describe("recordActivityResult", () => {
  it("enregistre un résultat completed et crée le progress record", async () => {
    const dependencies = createDependencies();

    const result = await recordActivityResult(
      "learner-1",
      baseInput,
      dependencies,
      recordedAt,
    );

    expect(dependencies.activityResultRepository.create).toHaveBeenCalledWith(
      baseInput,
    );

    expect(dependencies.progressRecordRepository.create).toHaveBeenCalledWith({
      learnerId: "learner-1",
      goalId: "goal-1",
      activityId: "activity-1",
      recordedAt,
      quantity: 2,
      unit: "page",
    });

    expect(result.progressRecord).not.toBeNull();
  });

  it("enregistre un résultat partial dans la progression", async () => {
    const dependencies = createDependencies();

    const input = {
      ...baseInput,
      status: "partial" as const,
      quantity: 1,
    };

    await recordActivityResult("learner-1", input, dependencies, recordedAt);

    expect(dependencies.progressRecordRepository.create).toHaveBeenCalled();
  });

  it("n'ajoute pas failed à la progression", async () => {
    const dependencies = createDependencies();

    const input = {
      ...baseInput,
      status: "failed" as const,
      quantity: 0,
    };

    const result = await recordActivityResult(
      "learner-1",
      input,
      dependencies,
      recordedAt,
    );

    expect(dependencies.activityResultRepository.create).toHaveBeenCalledWith(
      input,
    );

    expect(dependencies.progressRecordRepository.create).not.toHaveBeenCalled();

    expect(result.progressRecord).toBeNull();
  });

  it("n'ajoute pas skipped à la progression", async () => {
    const dependencies = createDependencies();

    const input = {
      ...baseInput,
      status: "skipped" as const,
      quantity: 0,
    };

    const result = await recordActivityResult(
      "learner-1",
      input,
      dependencies,
      recordedAt,
    );

    expect(dependencies.progressRecordRepository.create).not.toHaveBeenCalled();

    expect(result.progressRecord).toBeNull();
  });

  it("refuse une activité inexistante", async () => {
    const dependencies = createDependencies();

    dependencies.activityRepository.findById.mockResolvedValue(null);

    await expect(
      recordActivityResult("learner-1", baseInput, dependencies),
    ).rejects.toThrow("Activity not found");
  });

  it("refuse une activité sans objectif", async () => {
    const dependencies = createDependencies();

    dependencies.activityRepository.findById.mockResolvedValue({
      id: "activity-1",
      learnerId: "learner-1",
      goalId: null,
    });

    await expect(
      recordActivityResult("learner-1", baseInput, dependencies),
    ).rejects.toThrow("Activity must be linked to a goal");
  });

  it("refuse une unité différente de celle de l'objectif", async () => {
    const dependencies = createDependencies();

    await expect(
      recordActivityResult(
        "learner-1",
        {
          ...baseInput,
          unit: "ayah",
        },
        dependencies,
      ),
    ).rejects.toThrow("Activity result unit does not match goal unit");

    expect(dependencies.activityResultRepository.create).not.toHaveBeenCalled();
  });

  it("refuse une quantité négative", async () => {
    const dependencies = createDependencies();

    await expect(
      recordActivityResult(
        "learner-1",
        {
          ...baseInput,
          quantity: -1,
        },
        dependencies,
      ),
    ).rejects.toThrow("Activity result quantity must be zero or greater");
  });
});

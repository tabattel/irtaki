import { describe, expect, it, vi } from "vitest";
import { startActivity, type StartActivityInput } from "./start-activity";

const startedAt = new Date("2026-09-23T10:00:00.000Z");

const baseInput: StartActivityInput = {
  learnerId: "learner-1",
  goalId: "goal-1",
  action: "memorize",
  startedAt,
};

function createGoal() {
  return {
    id: "goal-1",
    title: "Mémoriser 10 pages",
    quantity: 10,
    unit: "page" as const,
    frequencyCount: 2,
    frequencyPeriod: "week" as const,
    intervalDays: null,
    weekday: null,
    startDate: new Date("2026-09-21T00:00:00.000Z"),
    endDate: null,
    status: "active" as const,
    action: "memorize" as const,
  };
}

function createDependencies() {
  return {
    learnerRepository: {
      findById: vi.fn().mockResolvedValue({
        id: "learner-1",
      }),
    },
    goalRepository: {
      findById: vi.fn().mockResolvedValue(createGoal()),
    },
    activityRepository: {
      create: vi.fn().mockResolvedValue({
        id: "activity-1",
        ...baseInput,
      }),
    },
  };
}

describe("startActivity", () => {
  it("démarre une activité liée à un objectif actif", async () => {
    const dependencies = createDependencies();

    const result = await startActivity("user-1", baseInput, dependencies);

    expect(dependencies.learnerRepository.findById).toHaveBeenCalledWith(
      "learner-1",
      "user-1",
    );

    expect(dependencies.goalRepository.findById).toHaveBeenCalledWith(
      "goal-1",
      "learner-1",
    );

    expect(dependencies.activityRepository.create).toHaveBeenCalledWith(
      baseInput,
    );

    expect(result).toEqual({
      id: "activity-1",
      ...baseInput,
    });
  });

  it("autorise une activité sans objectif", async () => {
    const dependencies = createDependencies();

    const input = {
      ...baseInput,
      goalId: undefined,
    };

    await startActivity("user-1", input, dependencies);

    expect(dependencies.goalRepository.findById).not.toHaveBeenCalled();

    expect(dependencies.activityRepository.create).toHaveBeenCalledWith(input);
  });

  it("refuse un learner inexistant", async () => {
    const dependencies = createDependencies();

    dependencies.learnerRepository.findById.mockResolvedValue(null);

    await expect(
      startActivity("user-1", baseInput, dependencies),
    ).rejects.toThrow("Learner not found");

    expect(dependencies.activityRepository.create).not.toHaveBeenCalled();
  });

  it("refuse un objectif inexistant", async () => {
    const dependencies = createDependencies();

    dependencies.goalRepository.findById.mockResolvedValue(null);

    await expect(
      startActivity("user-1", baseInput, dependencies),
    ).rejects.toThrow("Goal not found");
  });

  it("refuse un objectif inactif", async () => {
    const dependencies = createDependencies();

    dependencies.goalRepository.findById.mockResolvedValue({
      ...createGoal(),
      status: "paused",
    });

    await expect(
      startActivity("user-1", baseInput, dependencies),
    ).rejects.toThrow("Goal is not active");
  });

  it("refuse une action différente de celle de l'objectif", async () => {
    const dependencies = createDependencies();

    await expect(
      startActivity(
        "user-1",
        {
          ...baseInput,
          action: "read",
        },
        dependencies,
      ),
    ).rejects.toThrow("Activity action does not match goal action");
  });

  it("refuse une fin antérieure au début", async () => {
    const dependencies = createDependencies();

    await expect(
      startActivity(
        "user-1",
        {
          ...baseInput,
          endedAt: new Date("2026-09-23T09:59:00.000Z"),
        },
        dependencies,
      ),
    ).rejects.toThrow("Activity endedAt must be after startedAt");
  });

  it("refuse une durée négative", async () => {
    const dependencies = createDependencies();

    await expect(
      startActivity(
        "user-1",
        {
          ...baseInput,
          durationSec: -1,
        },
        dependencies,
      ),
    ).rejects.toThrow("Activity durationSec must be zero or greater");
  });
});

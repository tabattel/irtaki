import { describe, expect, it, vi } from "vitest";
import { createGoal, type CreateGoalInput } from "./create-goal";

const baseInput: CreateGoalInput = {
  learnerId: "learner-1",
  title: "Mémoriser 10 pages",
  action: "memorize",
  quantity: 10,
  unit: "page",
  frequencyCount: 2,
  frequencyPeriod: "week",
  startDate: new Date("2026-09-21T00:00:00.000Z"),
};

function createDependencies() {
  return {
    learnerRepository: {
      findById: vi.fn().mockResolvedValue({
        id: "learner-1",
      }),
    },
    goalRepository: {
      create: vi.fn().mockResolvedValue({
        id: "goal-1",
        ...baseInput,
      }),
      findById: vi.fn().mockResolvedValue({
        id: "parent-goal-1",
        learnerId: "learner-1",
      }),
    },
  };
}

describe("createGoal", () => {
  it("accepte les trois actions supplémentaires définies dans Prisma", async () => {
    const dependencies = createDependencies();

    for (const action of ["qiraa", "khatma", "tahajjud"] as const) {
      await createGoal(
        "user-1",
        { ...baseInput, action },
        dependencies,
      );
    }

    expect(dependencies.goalRepository.create).toHaveBeenCalledTimes(3);
  });

  it("transmet une cible valide au repository", async () => {
    const dependencies = createDependencies();
    const target = {
      scope: "page_range" as const,
      startValue: "1",
      endValue: "5",
    };
    const input = { ...baseInput, target };

    await createGoal("user-1", input, dependencies);

    expect(dependencies.goalRepository.create).toHaveBeenCalledWith(input);
  });

  it("refuse une cible de plage sans bornes", async () => {
    const dependencies = createDependencies();

    await expect(
      createGoal(
        "user-1",
        {
          ...baseInput,
          target: { scope: "page_range" },
        },
        dependencies,
      ),
    ).rejects.toThrow(
      "Goal target range requires startValue and endValue",
    );

    expect(dependencies.goalRepository.create).not.toHaveBeenCalled();
  });

  it("refuse des bornes de plage non entières ou non positives", async () => {
    const dependencies = createDependencies();

    await expect(
      createGoal(
        "user-1",
        {
          ...baseInput,
          target: {
            scope: "page_range",
            startValue: "1",
            endValue: "0",
          },
        },
        dependencies,
      ),
    ).rejects.toThrow(
      "Goal target range values must be positive integers",
    );

    expect(dependencies.goalRepository.create).not.toHaveBeenCalled();
  });

  it("refuse une plage dont la borne de début dépasse la borne de fin", async () => {
    const dependencies = createDependencies();

    await expect(
      createGoal(
        "user-1",
        {
          ...baseInput,
          target: {
            scope: "ayah_range",
            startValue: "10",
            endValue: "3",
          },
        },
        dependencies,
      ),
    ).rejects.toThrow(
      "Goal target startValue must not exceed endValue",
    );

    expect(dependencies.goalRepository.create).not.toHaveBeenCalled();
  });

  it("refuse un périmètre de cible inconnu", async () => {
    const dependencies = createDependencies();

    await expect(
      createGoal(
        "user-1",
        {
          ...baseInput,
          target: {
            scope: "unknown_scope",
          } as unknown as NonNullable<CreateGoalInput["target"]>,
        },
        dependencies,
      ),
    ).rejects.toThrow("Goal target scope is invalid");

    expect(dependencies.goalRepository.create).not.toHaveBeenCalled();
  });

  it("crée un objectif pour un learner appartenant à l'utilisateur", async () => {
    const dependencies = createDependencies();

    const result = await createGoal("user-1", baseInput, dependencies);

    expect(dependencies.learnerRepository.findById).toHaveBeenCalledWith(
      "learner-1",
      "user-1",
    );

    expect(dependencies.goalRepository.create).toHaveBeenCalledWith(baseInput);

    expect(result).toEqual({
      id: "goal-1",
      ...baseInput,
    });
  });

  it("refuse un learner inexistant", async () => {
    const dependencies = createDependencies();

    dependencies.learnerRepository.findById.mockResolvedValue(null);

    await expect(createGoal("user-1", baseInput, dependencies)).rejects.toThrow(
      "Learner not found",
    );

    expect(dependencies.goalRepository.create).not.toHaveBeenCalled();
  });

  it("refuse une quantité nulle ou négative", async () => {
    const dependencies = createDependencies();

    await expect(
      createGoal(
        "user-1",
        {
          ...baseInput,
          quantity: 0,
        },
        dependencies,
      ),
    ).rejects.toThrow("Goal quantity must be greater than zero");
  });

  it("refuse une fréquence invalide", async () => {
    const dependencies = createDependencies();

    await expect(
      createGoal(
        "user-1",
        {
          ...baseInput,
          frequencyCount: 0,
        },
        dependencies,
      ),
    ).rejects.toThrow("Goal frequencyCount must be greater than zero");
  });

  it("refuse une date de fin antérieure à la date de début", async () => {
    const dependencies = createDependencies();

    await expect(
      createGoal(
        "user-1",
        {
          ...baseInput,
          endDate: new Date("2026-09-20T00:00:00.000Z"),
        },
        dependencies,
      ),
    ).rejects.toThrow("Goal endDate must be after startDate");
  });

  it("accepte les unités nisf et roboa", async () => {
    const dependencies = createDependencies();

    await createGoal(
      "user-1",
      {
        ...baseInput,
        quantity: 2,
        unit: "nisf",
      },
      dependencies,
    );

    await createGoal(
      "user-1",
      {
        ...baseInput,
        quantity: 2,
        unit: "roboa",
      },
      dependencies,
    );

    expect(dependencies.goalRepository.create).toHaveBeenCalledTimes(2);
  });

  it("refuse un objectif parent appartenant à un autre objectif/learner", async () => {
    const dependencies = createDependencies();

    dependencies.goalRepository.findById.mockResolvedValue(null);

    await expect(
      createGoal(
        "user-1",
        {
          ...baseInput,
          parentGoalId: "foreign-parent",
        },
        dependencies,
      ),
    ).rejects.toThrow("Parent goal not found");
  });

  it("accepte une heure de notification valide", async () => {
    const dependencies = createDependencies();

    await expect(
      createGoal(
        "user-1",
        {
          ...baseInput,
          notificationEnabled: true,
          notificationTime: "08:30",
        },
        dependencies,
      ),
    ).resolves.toBeDefined();
  });

  it("refuse une heure de notification invalide", async () => {
    const dependencies = createDependencies();

    await expect(
      createGoal(
        "user-1",
        {
          ...baseInput,
          notificationTime: "25:90",
        },
        dependencies,
      ),
    ).rejects.toThrow("Goal notificationTime must use HH:mm format");
  });

  it("exige l'heure si les notifications sont activées", async () => {
    const dependencies = createDependencies();

    await expect(
      createGoal(
        "user-1",
        {
          ...baseInput,
          notificationEnabled: true,
        },
        dependencies,
      ),
    ).rejects.toThrow(
      "Goal notificationTime is required when notifications are enabled",
    );
  });
});

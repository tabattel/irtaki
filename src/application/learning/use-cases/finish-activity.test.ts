import { describe, expect, it, vi } from "vitest";
import {
  finishActivity,
  type FinishActivityDependencies,
} from "./finish-activity";

function makeDependencies(learnerExists = true): FinishActivityDependencies {
  return {
    learnerRepository: {
      findById: vi.fn(async () => (learnerExists ? { id: "learner-1" } : null)),
    },
    activityRepository: {
      findById: vi.fn(async () => ({
        id: "activity-1",
        startedAt: new Date("2026-10-28T10:00:00.000Z"),
        endedAt: null,
      })),
      update: vi.fn(async () => ({ id: "activity-1" })),
    },
    activityAyahTraceRepository: {
      updateStatusesByActivityId: vi.fn(async () => 2),
    },
  };
}

describe("finishActivity", () => {
  it("enregistre la clôture et le statut des ayahs", async () => {
    const dependencies = makeDependencies();
    const endedAt = new Date("2026-10-28T10:02:00.000Z");

    const result = await finishActivity(
      "user-1",
      {
        learnerId: "learner-1",
        activityId: "activity-1",
        status: "completed",
      },
      dependencies,
      endedAt,
    );

    expect(result.durationSec).toBe(120);
    expect(result.updatedTraceCount).toBe(2);
    expect(dependencies.activityRepository.update).toHaveBeenCalled();
    expect(
      dependencies.activityAyahTraceRepository.updateStatusesByActivityId,
    ).toHaveBeenCalledWith("activity-1", "completed", endedAt);
  });

  it("refuse un apprenant étranger au compte", async () => {
    const dependencies = makeDependencies(false);

    await expect(
      finishActivity(
        "user-1",
        {
          learnerId: "learner-other",
          activityId: "activity-1",
          status: "completed",
        },
        dependencies,
      ),
    ).rejects.toThrow("Learner not found");

    expect(dependencies.activityRepository.update).not.toHaveBeenCalled();
  });
});

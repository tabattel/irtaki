import { describe, expect, it, vi } from "vitest";

import {
  createStatisticsService,
  type StatisticsActivityRow,
  type StatisticsAyahTraceRow,
} from "./statistics-service";

describe("statistics service", () => {
  function createDependencies(
    activityRows: StatisticsActivityRow[] = [],
    traceRows: StatisticsAyahTraceRow[] = [],
    learner: unknown | null = { id: "learner-1" },
  ) {
    return {
      learnerRepository: {
        findById: vi.fn().mockResolvedValue(learner),
      },
      statisticsRepository: {
        findActivitiesByLearnerIdInRange: vi
          .fn()
          .mockResolvedValue(activityRows),
        findAyahTracesByLearnerIdInRange: vi
          .fn()
          .mockResolvedValue(traceRows),
      },
    };
  }

  it("rejects access to a learner outside the authenticated account", async () => {
    const dependencies = createDependencies([], [], null);
    const service = createStatisticsService(dependencies);

    await expect(
      service.getStatistics("user-1", "learner-other", {
        timeZone: "Africa/Algiers",
      }),
    ).rejects.toThrow("Learner not found");

    expect(
      dependencies.statisticsRepository.findActivitiesByLearnerIdInRange,
    ).not.toHaveBeenCalled();

    expect(
      dependencies.statisticsRepository.findAyahTracesByLearnerIdInRange,
    ).not.toHaveBeenCalled();
  });

  it("loads both data sources and maps imported Quran divisions", async () => {
    const activityRows: StatisticsActivityRow[] = [
      {
        id: "activity-1",
        action: "read",
        startedAt: new Date("2026-10-01T08:00:00.000Z"),
        endedAt: new Date("2026-10-01T08:02:00.000Z"),
        durationSec: 120,
        result: { status: "completed" },
      },
    ];

    const traceRows: StatisticsAyahTraceRow[] = [
      {
        id: "trace-1",
        activityId: "activity-1",
        ayahId: 1,
        status: "completed",
        recordedAt: new Date("2026-10-01T08:02:00.000Z"),
        mushafPageNumber: 2,
        activity: {
          action: "read",
          startedAt: new Date("2026-10-01T08:00:00.000Z"),
          endedAt: new Date("2026-10-01T08:02:00.000Z"),
          result: {
            createdAt: new Date("2026-10-01T08:02:00.000Z"),
          },
        },
        ayah: {
          number: 1,
          surahNumber: 1,
          pageNumber: 1,
          juz: 1,
          hizb: 5,
        },
      },
    ];

    const dependencies = createDependencies(activityRows, traceRows);
    const service = createStatisticsService(dependencies);

    const result = await service.getStatistics(
      "user-1",
      "learner-1",
      {
        from: "2026-10-01",
        to: "2026-10-01",
        timeZone: "Africa/Algiers",
      },
    );

    expect(
      dependencies.learnerRepository.findById,
    ).toHaveBeenCalledWith("learner-1", "user-1");

    expect(
      dependencies.statisticsRepository.findActivitiesByLearnerIdInRange,
    ).toHaveBeenCalledOnce();

    expect(
      dependencies.statisticsRepository.findAyahTracesByLearnerIdInRange,
    ).toHaveBeenCalledOnce();

    expect(result.summary.activityCount).toBe(1);
    expect(result.summary.durationSec).toBe(120);
    expect(result.quran.byHizb[0].key).toBe(2);
    expect(result.quran.byPage[0].key).toBe(2);
  });
});

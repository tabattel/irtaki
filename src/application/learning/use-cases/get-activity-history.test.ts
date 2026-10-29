import { describe, expect, it, vi } from "vitest";
import {
  getActivityHistory,
  type ActivityHistoryTrace,
} from "./get-activity-history";

const trace: ActivityHistoryTrace = {
  activityId: "activity-1",
  ayahId: 8,
  status: "completed",
  recordedAt: new Date("2026-10-26T11:30:00.000Z"),
  startedAt: new Date("2026-10-26T11:00:00.000Z"),
  endedAt: new Date("2026-10-26T11:20:00.000Z"),
  resultCreatedAt: null,
  action: "read",
  ayahNumber: 2,
  surahNumber: 2,
  pageNumber: 1,
};

describe("getActivityHistory", () => {
  it("retourne les références et dates, sans texte coranique", async () => {
    const dependencies = {
      learnerRepository: {
        findById: vi.fn().mockResolvedValue({ id: "learner-1" }),
      },
      activityAyahTraceRepository: {
        findHistoryByLearnerId: vi.fn().mockResolvedValue([trace]),
      },
    };

    const result = await getActivityHistory(
      "user-1",
      "learner-1",
      dependencies,
    );

    expect(result.records).toEqual([
      {
        activityId: "activity-1",
        ayahId: 8,
        status: "completed",
        action: "read",
        ayahNumber: 2,
        surahNumber: 2,
        pageNumber: 1,
        occurredAt: "2026-10-26T11:30:00.000Z",
        startedAt: "2026-10-26T11:00:00.000Z",
      },
    ]);
  });

  it("retourne les métadonnées de lignes disponibles", async () => {
    const dependencies = {
      learnerRepository: {
        findById: vi.fn().mockResolvedValue({ id: "learner-1" }),
      },
      activityAyahTraceRepository: {
        findHistoryByLearnerId: vi.fn().mockResolvedValue([
          { ...trace, lineNumbers: [4, 5], pageLineCount: 15 },
        ]),
      },
    };

    const result = await getActivityHistory(
      "user-1",
      "learner-1",
      dependencies,
    );

    expect(result.records[0]).toMatchObject({
      pageNumber: 1,
      lineNumbers: [4, 5],
      pageLineCount: 15,
    });
  });

  it("refuse un apprenant d'un autre compte", async () => {
    const dependencies = {
      learnerRepository: {
        findById: vi.fn().mockResolvedValue(null),
      },
      activityAyahTraceRepository: {
        findHistoryByLearnerId: vi.fn(),
      },
    };

    await expect(
      getActivityHistory("user-1", "learner-other", dependencies),
    ).rejects.toThrow("Learner not found");

    expect(
      dependencies.activityAyahTraceRepository.findHistoryByLearnerId,
    ).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  getSurahHistory,
  type GetSurahHistoryTrace,
} from "./get-surah-history";

function makeTrace(
  activityId: string,
  action: GetSurahHistoryTrace["action"],
  startedAt: string,
  ayahId: number,
): GetSurahHistoryTrace {
  return {
    activityId,
    action,
    ayahId,
    ayahNumber: ayahId,
    pageNumber: 1,
    recordedAt: null,
    startedAt: new Date(startedAt),
    endedAt: new Date(startedAt),
    resultCreatedAt: null,
  };
}

function makeDependencies(traces: GetSurahHistoryTrace[]) {
  return {
    learnerRepository: {
      findById: vi.fn().mockResolvedValue({ id: "learner-1" }),
    },
    activityAyahTraceRepository: {
      findCompletedByLearnerIdForSurah: vi.fn().mockResolvedValue(traces),
    },
  };
}

describe("getSurahHistory", () => {
  it("compte une activité une seule fois même si plusieurs versets sont tracés", async () => {
    const dependencies = makeDependencies([
      makeTrace("activity-1", "read", "2026-10-24T10:00:00.000Z", 1),
      makeTrace("activity-1", "read", "2026-10-24T10:00:00.000Z", 2),
      makeTrace("activity-2", "read", "2026-10-26T12:00:00.000Z", 3),
      makeTrace("activity-3", "listen", "2026-10-25T09:00:00.000Z", 4),
    ]);

    const result = await getSurahHistory(
      "user-1",
      "learner-1",
      1,
      dependencies,
    );

    expect(result.items).toEqual([
      {
        action: "read",
        count: 2,
        lastPerformedAt: "2026-10-26T12:00:00.000Z",
      },
      {
        action: "listen",
        count: 1,
        lastPerformedAt: "2026-10-25T09:00:00.000Z",
      },
    ]);

    expect(
      dependencies.activityAyahTraceRepository.findCompletedByLearnerIdForSurah,
    ).toHaveBeenCalledWith("learner-1", 1);
  });

  it("refuse un apprenant qui n'appartient pas à l'utilisateur", async () => {
    const dependencies = makeDependencies([]);
    dependencies.learnerRepository.findById.mockResolvedValue(null);

    await expect(
      getSurahHistory("user-1", "learner-other", 1, dependencies),
    ).rejects.toThrow("Learner not found");

    expect(
      dependencies.activityAyahTraceRepository.findCompletedByLearnerIdForSurah,
    ).not.toHaveBeenCalled();
  });

  it("refuse un numéro de sourate invalide", async () => {
    const dependencies = makeDependencies([]);

    await expect(
      getSurahHistory("user-1", "learner-1", 115, dependencies),
    ).rejects.toThrow("Surah number must be between 1 and 114");
  });
});

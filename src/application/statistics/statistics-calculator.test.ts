import { describe, expect, it } from "vitest";

import { calculateStatistics } from "./statistics-calculator";
import { resolveStatisticsRange } from "./statistics-date-range";
import type {
  StatisticsActivityRecord,
  StatisticsAyahTraceRecord,
} from "./statistics-types";

const range = resolveStatisticsRange({
  from: "2026-10-01",
  to: "2026-10-03",
  timeZone: "Africa/Algiers",
});

const activities: StatisticsActivityRecord[] = [
  {
    id: "activity-1",
    action: "read",
    startedAt: new Date("2026-10-01T08:00:00.000Z"),
    endedAt: new Date("2026-10-01T08:02:00.000Z"),
    durationSec: 120,
    resultStatus: "completed",
  },
  {
    id: "activity-2",
    action: "listen",
    startedAt: new Date("2026-10-02T08:00:00.000Z"),
    endedAt: new Date("2026-10-02T08:01:00.000Z"),
    durationSec: 60,
    resultStatus: null,
  },
  {
    id: "activity-3",
    action: "read",
    startedAt: new Date("2026-10-02T09:00:00.000Z"),
    endedAt: null,
    durationSec: null,
    resultStatus: null,
  },
];

const traces: StatisticsAyahTraceRecord[] = [
  {
    id: "trace-1",
    activityId: "activity-1",
    ayahId: 1,
    status: "completed",
    recordedAt: new Date("2026-10-01T08:02:00.000Z"),
    startedAt: new Date("2026-10-01T08:00:00.000Z"),
    endedAt: new Date("2026-10-01T08:02:00.000Z"),
    resultCreatedAt: null,
    action: "read",
    surahNumber: 1,
    ayahNumber: 1,
    pageNumber: 1,
    juz: 1,
    rubNumber: 1,
  },
  {
    id: "trace-2",
    activityId: "activity-2",
    ayahId: 1,
    status: "partial",
    recordedAt: new Date("2026-10-02T08:01:00.000Z"),
    startedAt: new Date("2026-10-02T08:00:00.000Z"),
    endedAt: new Date("2026-10-02T08:01:00.000Z"),
    resultCreatedAt: null,
    action: "listen",
    surahNumber: 1,
    ayahNumber: 1,
    pageNumber: 1,
    juz: 1,
    rubNumber: 3,
  },
  {
    id: "trace-3",
    activityId: "activity-3",
    ayahId: 2,
    status: "started",
    recordedAt: null,
    startedAt: new Date("2026-10-02T09:00:00.000Z"),
    endedAt: null,
    resultCreatedAt: null,
    action: "read",
    surahNumber: 1,
    ayahNumber: 2,
    pageNumber: 1,
    juz: 1,
    rubNumber: 5,
  },
];

describe("calculateStatistics", () => {
  it("calculates sessions, durations and distinct ayahs separately", () => {
    const result = calculateStatistics({
      range,
      activities,
      traces,
    });

    expect(result.summary).toEqual({
      activityCount: 3,
      finishedActivityCount: 2,
      unfinishedActivityCount: 1,
      activitiesWithResult: 1,
      activitiesWithDuration: 2,
      durationSec: 180,
      averageDurationSec: 90,
      activeDayCount: 2,
      traceCount: 3,
      uniqueAyahCount: 2,
      validatedTraceCount: 2,
      validatedUniqueAyahCount: 1,
    });
  });

  it("does not double-count one ayah in the distinct coverage", () => {
    const result = calculateStatistics({
      range,
      activities,
      traces,
    });

    expect(result.summary.traceCount).toBe(3);
    expect(result.summary.uniqueAyahCount).toBe(2);
    expect(result.summary.validatedTraceCount).toBe(2);
    expect(result.summary.validatedUniqueAyahCount).toBe(1);
  });

  it("groups activities and traces by action", () => {
    const result = calculateStatistics({
      range,
      activities,
      traces,
    });

    const read = result.byAction.find((item) => item.action === "read");
    const listen = result.byAction.find((item) => item.action === "listen");

    expect(read).toMatchObject({
      activityCount: 2,
      finishedActivityCount: 1,
      durationSec: 120,
      traceCount: 2,
      uniqueAyahCount: 2,
    });

    expect(listen).toMatchObject({
      activityCount: 1,
      durationSec: 60,
      traceCount: 1,
      uniqueAyahCount: 1,
    });
  });

  it("converts imported rub numbers into 60 hizb", () => {
    const result = calculateStatistics({
      range,
      activities,
      traces,
    });

    expect(result.quran.byHizb).toHaveLength(2);

    expect(result.quran.byHizb[0]).toMatchObject({
      key: 1,
      traceCount: 2,
      uniqueAyahCount: 1,
      validatedUniqueAyahCount: 1,
    });

    expect(result.quran.byHizb[1]).toMatchObject({
      key: 2,
      traceCount: 1,
      uniqueAyahCount: 1,
      validatedUniqueAyahCount: 0,
    });
  });

  it("groups daily timeline data and keeps empty days", () => {
    const result = calculateStatistics({
      range,
      activities,
      traces,
      groupBy: "day",
    });

    expect(result.timeline).toHaveLength(3);
    expect(result.timeline[0]).toMatchObject({
      key: "2026-10-01",
      activityCount: 1,
      traceCount: 1,
    });
    expect(result.timeline[1]).toMatchObject({
      key: "2026-10-02",
      activityCount: 2,
      traceCount: 2,
    });
    expect(result.timeline[2]).toMatchObject({
      key: "2026-10-03",
      activityCount: 0,
      traceCount: 0,
    });
  });

  it("supports weekly and monthly grouping", () => {
    const weekly = calculateStatistics({
      range,
      activities,
      traces,
      groupBy: "week",
    });

    const monthly = calculateStatistics({
      range,
      activities,
      traces,
      groupBy: "month",
    });

    expect(weekly.timeline).toHaveLength(1);
    expect(weekly.timeline[0].key).toBe("2026-09-28");

    expect(monthly.timeline).toHaveLength(1);
    expect(monthly.timeline[0].key).toBe("2026-10");
  });

  it("returns zero values when there is no activity", () => {
    const result = calculateStatistics({
      range,
      activities: [],
      traces: [],
    });

    expect(result.summary.activityCount).toBe(0);
    expect(result.summary.traceCount).toBe(0);
    expect(result.summary.durationSec).toBe(0);
    expect(result.timeline.every((item) => item.activityCount === 0)).toBe(
      true,
    );
  });

  it("uses the trace date fallback in the expected order", () => {
    const fallbackTrace: StatisticsAyahTraceRecord = {
      ...traces[0],
      recordedAt: null,
      endedAt: null,
      resultCreatedAt: new Date("2026-10-03T08:00:00.000Z"),
      startedAt: new Date("2026-09-30T08:00:00.000Z"),
    };

    const result = calculateStatistics({
      range,
      activities: [],
      traces: [fallbackTrace],
    });

    expect(result.timeline[2].traceCount).toBe(1);
    expect(result.summary.uniqueAyahCount).toBe(1);
  });
});

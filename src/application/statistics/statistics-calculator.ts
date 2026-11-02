import {
  addCalendarDays,
  getDateKeyInTimeZone,
} from "./statistics-date-range";

import {
  STATISTICS_ACTIONS,
  STATISTICS_RESULT_STATUSES,
  STATISTICS_TRACE_STATUSES,
  type StatisticsAction,
  type StatisticsActivityRecord,
  type StatisticsAyahTraceRecord,
  type StatisticsBreakdownItem,
  type StatisticsGroupBy,
  type StatisticsRange,
  type StatisticsResult,
  type StatisticsResultStatus,
  type StatisticsTraceStatus,
} from "./statistics-types";

type CalculatorInput = {
  range: StatisticsRange;
  activities: readonly StatisticsActivityRecord[];
  traces: readonly StatisticsAyahTraceRecord[];
  groupBy?: StatisticsGroupBy;
};

type MutableTimelineItem = {
  key: string;
  activityCount: number;
  durationSec: number;
  traceCount: number;
  ayahIds: Set<number>;
};

type MutableBreakdownItem = {
  key: number;
  traceCount: number;
  ayahIds: Set<number>;
  validatedAyahIds: Set<number>;
  byAction: Partial<Record<StatisticsAction, number>>;
};

const VALIDATED_TRACE_STATUSES = new Set<StatisticsTraceStatus>([
  "completed",
  "partial",
]);

function isValidated(status: StatisticsTraceStatus): boolean {
  return VALIDATED_TRACE_STATUSES.has(status);
}

function isWithinRange(dateKey: string, range: StatisticsRange): boolean {
  return dateKey >= range.from && dateKey <= range.to;
}

function traceOccurredAt(trace: StatisticsAyahTraceRecord): Date {
  return (
    trace.recordedAt ??
    trace.endedAt ??
    trace.resultCreatedAt ??
    trace.startedAt
  );
}

function mondayOf(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const weekday = (date.getUTCDay() + 6) % 7;

  date.setUTCDate(date.getUTCDate() - weekday);

  return date.toISOString().slice(0, 10);
}

function periodKey(dateKey: string, groupBy: StatisticsGroupBy): string {
  switch (groupBy) {
    case "week":
      return mondayOf(dateKey);
    case "month":
      return dateKey.slice(0, 7);
    case "day":
    default:
      return dateKey;
  }
}

function createTimelineItem(key: string): MutableTimelineItem {
  return {
    key,
    activityCount: 0,
    durationSec: 0,
    traceCount: 0,
    ayahIds: new Set<number>(),
  };
}

function initializeTimeline(
  range: StatisticsRange,
  groupBy: StatisticsGroupBy,
): Map<string, MutableTimelineItem> {
  const buckets = new Map<string, MutableTimelineItem>();

  for (
    let current = range.from;
    current <= range.to;
    current = addCalendarDays(current, 1)
  ) {
    const key = periodKey(current, groupBy);

    if (!buckets.has(key)) {
      buckets.set(key, createTimelineItem(key));
    }
  }

  return buckets;
}

function createBreakdownItem(key: number): MutableBreakdownItem {
  return {
    key,
    traceCount: 0,
    ayahIds: new Set<number>(),
    validatedAyahIds: new Set<number>(),
    byAction: {},
  };
}

function buildBreakdown(
  traces: readonly StatisticsAyahTraceRecord[],
  getKey: (trace: StatisticsAyahTraceRecord) => number | null,
): StatisticsBreakdownItem[] {
  const groups = new Map<number, MutableBreakdownItem>();

  for (const trace of traces) {
    const key = getKey(trace);

    if (key === null || !Number.isSafeInteger(key) || key < 1) continue;

    let item = groups.get(key);

    if (!item) {
      item = createBreakdownItem(key);
      groups.set(key, item);
    }

    item.traceCount += 1;
    item.ayahIds.add(trace.ayahId);

    if (isValidated(trace.status)) {
      item.validatedAyahIds.add(trace.ayahId);
    }

    item.byAction[trace.action] = (item.byAction[trace.action] ?? 0) + 1;
  }

  return [...groups.values()]
    .sort((a, b) => a.key - b.key)
    .map((item) => ({
      key: item.key,
      traceCount: item.traceCount,
      uniqueAyahCount: item.ayahIds.size,
      validatedUniqueAyahCount: item.validatedAyahIds.size,
      byAction: item.byAction,
    }));
}

function createZeroRecord<T extends string>(
  keys: readonly T[],
): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}

export function calculateStatistics(
  input: CalculatorInput,
): StatisticsResult {
  const { range } = input;
  const groupBy = input.groupBy ?? "day";

  const activities = input.activities.filter((activity) =>
    isWithinRange(
      getDateKeyInTimeZone(activity.startedAt, range.timeZone),
      range,
    ),
  );

  const traces = input.traces.filter((trace) =>
    isWithinRange(
      getDateKeyInTimeZone(traceOccurredAt(trace), range.timeZone),
      range,
    ),
  );

  const resultStatusCounts =
    createZeroRecord<StatisticsResultStatus>(STATISTICS_RESULT_STATUSES);

  const traceStatusCounts =
    createZeroRecord<StatisticsTraceStatus>(STATISTICS_TRACE_STATUSES);

  const byAction = new Map<
    StatisticsAction,
    {
      activityCount: number;
      finishedActivityCount: number;
      durationSec: number;
      activitiesWithDuration: number;
      traceCount: number;
      ayahIds: Set<number>;
    }
  >();

  for (const action of STATISTICS_ACTIONS) {
    byAction.set(action, {
      activityCount: 0,
      finishedActivityCount: 0,
      durationSec: 0,
      activitiesWithDuration: 0,
      traceCount: 0,
      ayahIds: new Set<number>(),
    });
  }

  const timeline = initializeTimeline(range, groupBy);
  const activeDays = new Set<string>();
  const allAyahIds = new Set<number>();
  const validatedAyahIds = new Set<number>();

  let finishedActivityCount = 0;
  let activitiesWithDuration = 0;
  let durationSec = 0;
  let activitiesWithResult = 0;
  let validatedTraceCount = 0;

  for (const activity of activities) {
    const day = getDateKeyInTimeZone(activity.startedAt, range.timeZone);
    const key = periodKey(day, groupBy);
    const bucket = timeline.get(key);

    activeDays.add(day);

    if (bucket) bucket.activityCount += 1;

    const action = byAction.get(activity.action);

    if (action) {
      action.activityCount += 1;
    }

    if (activity.endedAt !== null) {
      finishedActivityCount += 1;

      if (action) action.finishedActivityCount += 1;
    }

    if (activity.durationSec !== null && activity.durationSec >= 0) {
      durationSec += activity.durationSec;
      activitiesWithDuration += 1;

      if (action) {
        action.durationSec += activity.durationSec;
        action.activitiesWithDuration += 1;
      }

      if (bucket) bucket.durationSec += activity.durationSec;
    }

    if (activity.resultStatus !== null) {
      activitiesWithResult += 1;
      resultStatusCounts[activity.resultStatus] += 1;
    }
  }

  for (const trace of traces) {
    const occurredAt = traceOccurredAt(trace);
    const day = getDateKeyInTimeZone(occurredAt, range.timeZone);
    const key = periodKey(day, groupBy);
    const bucket = timeline.get(key);

    activeDays.add(day);
    traceStatusCounts[trace.status] += 1;

    allAyahIds.add(trace.ayahId);

    if (isValidated(trace.status)) {
      validatedTraceCount += 1;
      validatedAyahIds.add(trace.ayahId);
    }

    if (bucket) {
      bucket.traceCount += 1;
      bucket.ayahIds.add(trace.ayahId);
    }

    const action = byAction.get(trace.action);

    if (action) {
      action.traceCount += 1;
      action.ayahIds.add(trace.ayahId);
    }
  }

  const byHizb = buildBreakdown(traces, (trace) => {
    if (
      !Number.isInteger(trace.rubNumber) ||
      trace.rubNumber < 1 ||
      trace.rubNumber > 240
    ) {
      return null;
    }

    return Math.floor((trace.rubNumber - 1) / 4) + 1;
  });

  const timelineResult = [...timeline.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      key: item.key,
      activityCount: item.activityCount,
      durationSec: item.durationSec,
      traceCount: item.traceCount,
      uniqueAyahCount: item.ayahIds.size,
    }));

  return {
    period: {
      from: range.from,
      to: range.to,
      timeZone: range.timeZone,
      groupBy,
    },
    summary: {
      activityCount: activities.length,
      finishedActivityCount,
      unfinishedActivityCount: activities.length - finishedActivityCount,
      activitiesWithResult,
      activitiesWithDuration,
      durationSec,
      averageDurationSec:
        activitiesWithDuration > 0
          ? Math.round(durationSec / activitiesWithDuration)
          : 0,
      activeDayCount: activeDays.size,
      traceCount: traces.length,
      uniqueAyahCount: allAyahIds.size,
      validatedTraceCount,
      validatedUniqueAyahCount: validatedAyahIds.size,
    },
    resultStatusCounts,
    traceStatusCounts,
    byAction: STATISTICS_ACTIONS.map((action) => {
      const item = byAction.get(action)!;

      return {
        action,
        activityCount: item.activityCount,
        finishedActivityCount: item.finishedActivityCount,
        durationSec: item.durationSec,
        activitiesWithDuration: item.activitiesWithDuration,
        traceCount: item.traceCount,
        uniqueAyahCount: item.ayahIds.size,
      };
    }),
    timeline: timelineResult,
    quran: {
      bySurah: buildBreakdown(
        traces,
        (trace) =>
          trace.surahNumber >= 1 && trace.surahNumber <= 114
            ? trace.surahNumber
            : null,
      ),
      byJuz: buildBreakdown(
        traces,
        (trace) =>
          trace.juz >= 1 && trace.juz <= 30 ? trace.juz : null,
      ),
      byHizb,
      byPage: buildBreakdown(
        traces,
        (trace) => (trace.pageNumber > 0 ? trace.pageNumber : null),
      ),
    },
  };
}

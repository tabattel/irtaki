export const STATISTICS_ACTIONS = [
  "read",
  "listen",
  "recite",
  "memorize",
  "revise",
  "tajwid",
  "tadabbur",
  "talkin",
  "tathbit",
  "qiraa",
  "khatma",
  "tahajjud",
  "tarteel1",
  "tarteel2",
] as const;

export type StatisticsAction = (typeof STATISTICS_ACTIONS)[number];

export const STATISTICS_TRACE_STATUSES = [
  "started",
  "completed",
  "partial",
  "failed",
  "skipped",
] as const;

export type StatisticsTraceStatus =
  (typeof STATISTICS_TRACE_STATUSES)[number];

export const STATISTICS_RESULT_STATUSES = [
  "completed",
  "partial",
  "failed",
  "skipped",
] as const;

export type StatisticsResultStatus =
  (typeof STATISTICS_RESULT_STATUSES)[number];

export type StatisticsGroupBy = "day" | "week" | "month";

export type StatisticsRange = {
  from: string;
  to: string;
  timeZone: string;
  startAt: Date;
  endAt: Date;
};

export type StatisticsActivityRecord = {
  id: string;
  action: StatisticsAction;
  startedAt: Date;
  endedAt: Date | null;
  durationSec: number | null;
  resultStatus: StatisticsResultStatus | null;
};

export type StatisticsAyahTraceRecord = {
  id: string;
  activityId: string;
  ayahId: number;
  status: StatisticsTraceStatus;
  recordedAt: Date | null;
  startedAt: Date;
  endedAt: Date | null;
  resultCreatedAt: Date | null;
  action: StatisticsAction;
  surahNumber: number;
  ayahNumber: number;
  pageNumber: number;
  juz: number;
  rubNumber: number;
  riwayaId: number | null;
  tariqId: number | null;
  wajhId: number | null;
  riwayaName: string | null;
  tariqName: string | null;
  wajhName: string | null;
};

export type StatisticsBreakdownItem = {
  key: number;
  traceCount: number;
  uniqueAyahCount: number;
  validatedUniqueAyahCount: number;
  byAction: Partial<Record<StatisticsAction, number>>;
};

export type StatisticsActionBreakdown = {
  action: StatisticsAction;
  activityCount: number;
  finishedActivityCount: number;
  durationSec: number;
  activitiesWithDuration: number;
  traceCount: number;
  uniqueAyahCount: number;
};

export type StatisticsTimelineItem = {
  key: string;
  activityCount: number;
  durationSec: number;
  traceCount: number;
  uniqueAyahCount: number;
};

export type StatisticsAxis =
  | "combination"
  | "riwaya"
  | "tariq"
  | "wajh";

export type StatisticsAxisBreakdownItem = {
  key: string;
  label: string;
  traceCount: number;
  uniqueAyahCount: number;
  validatedUniqueAyahCount: number;
  byAction: Partial<Record<StatisticsAction, number>>;
};

export type StatisticsResult = {
  period: {
    from: string;
    to: string;
    timeZone: string;
    groupBy: StatisticsGroupBy;
  };
  summary: {
    activityCount: number;
    finishedActivityCount: number;
    unfinishedActivityCount: number;
    activitiesWithResult: number;
    activitiesWithDuration: number;
    durationSec: number;
    averageDurationSec: number;
    activeDayCount: number;
    traceCount: number;
    uniqueAyahCount: number;
    validatedTraceCount: number;
    validatedUniqueAyahCount: number;
  };
  resultStatusCounts: Record<StatisticsResultStatus, number>;
  traceStatusCounts: Record<StatisticsTraceStatus, number>;
  byAction: StatisticsActionBreakdown[];
  timeline: StatisticsTimelineItem[];
  quran: {
    bySurah: StatisticsBreakdownItem[];
    byJuz: StatisticsBreakdownItem[];
    byHizb: StatisticsBreakdownItem[];
    byPage: StatisticsBreakdownItem[];
  };
  byAxis: {
    byRiwaya: StatisticsAxisBreakdownItem[];
    byTariq: StatisticsAxisBreakdownItem[];
    byWajh: StatisticsAxisBreakdownItem[];
    byCombination: StatisticsAxisBreakdownItem[];
  };
};

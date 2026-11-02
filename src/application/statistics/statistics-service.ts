import { calculateStatistics } from "./statistics-calculator";
import { resolveStatisticsRange, type StatisticsRangeInput } from "./statistics-date-range";

import type {
  StatisticsAction,
  StatisticsActivityRecord,
  StatisticsAyahTraceRecord,
  StatisticsGroupBy,
  StatisticsResult,
  StatisticsResultStatus,
  StatisticsTraceStatus,
} from "./statistics-types";

export type StatisticsActivityRow = {
  id: string;
  action: StatisticsAction;
  startedAt: Date;
  endedAt: Date | null;
  durationSec: number | null;
  result: {
    status: StatisticsResultStatus;
  } | null;
};

export type StatisticsAyahTraceRow = {
  id: string;
  activityId: string;
  ayahId: number;
  status: StatisticsTraceStatus;
  recordedAt: Date | null;
  mushafPageNumber: number | null;
  activity: {
    action: StatisticsAction;
    startedAt: Date;
    endedAt: Date | null;
    result: {
      createdAt: Date;
    } | null;
  };
  ayah: {
    number: number;
    surahNumber: number;
    pageNumber: number;
    juz: number;
    hizb: number;
  };
};

export type StatisticsServiceDependencies = {
  learnerRepository: {
    findById(id: string, userId: string): Promise<unknown | null>;
  };
  statisticsRepository: {
    findActivitiesByLearnerIdInRange(
      learnerId: string,
      startAt: Date,
      endAt: Date,
    ): Promise<StatisticsActivityRow[]>;
    findAyahTracesByLearnerIdInRange(
      learnerId: string,
      startAt: Date,
      endAt: Date,
    ): Promise<StatisticsAyahTraceRow[]>;
  };
};

export type GetStatisticsInput = StatisticsRangeInput & {
  groupBy?: StatisticsGroupBy;
};

export function createStatisticsService(
  dependencies: StatisticsServiceDependencies,
) {
  return {
    async getStatistics(
      userId: string,
      learnerId: string,
      input: GetStatisticsInput = {},
      now = new Date(),
    ): Promise<StatisticsResult> {
      if (!userId.trim()) {
        throw new Error("User id is required");
      }

      if (!learnerId.trim()) {
        throw new Error("Learner id is required");
      }

      const learner = await dependencies.learnerRepository.findById(
        learnerId,
        userId,
      );

      if (learner === null) {
        throw new Error("Learner not found");
      }

      const range = resolveStatisticsRange(input, now);

      const [activityRows, traceRows] = await Promise.all([
        dependencies.statisticsRepository.findActivitiesByLearnerIdInRange(
          learnerId,
          range.startAt,
          range.endAt,
        ),
        dependencies.statisticsRepository.findAyahTracesByLearnerIdInRange(
          learnerId,
          range.startAt,
          range.endAt,
        ),
      ]);

      const activities: StatisticsActivityRecord[] = activityRows.map(
        (activity) => ({
          id: activity.id,
          action: activity.action,
          startedAt: activity.startedAt,
          endedAt: activity.endedAt,
          durationSec: activity.durationSec,
          resultStatus: activity.result?.status ?? null,
        }),
      );

      const traces: StatisticsAyahTraceRecord[] = traceRows.map((trace) => ({
        id: trace.id,
        activityId: trace.activityId,
        ayahId: trace.ayahId,
        status: trace.status,
        recordedAt: trace.recordedAt,
        startedAt: trace.activity.startedAt,
        endedAt: trace.activity.endedAt,
        resultCreatedAt: trace.activity.result?.createdAt ?? null,
        action: trace.activity.action,
        surahNumber: trace.ayah.surahNumber,
        ayahNumber: trace.ayah.number,
        pageNumber: trace.mushafPageNumber ?? trace.ayah.pageNumber,
        juz: trace.ayah.juz,
        // Dans les ressources importées, Ayah.hizb contient le numéro du rub'.
        rubNumber: trace.ayah.hizb,
      }));

      return calculateStatistics({
        range,
        activities,
        traces,
        groupBy: input.groupBy,
      });
    },
  };
}

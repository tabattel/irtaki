import type { LearningGoalAction } from "../types";

export type ActivityHistoryTrace = {
  activityId: string;
  ayahId: number;
  status: string;
  recordedAt: Date | null;
  startedAt: Date;
  endedAt: Date | null;
  resultCreatedAt: Date | null;
  action: LearningGoalAction;
  ayahNumber: number;
  surahNumber: number;
  pageNumber: number;
  lineNumbers?: number[];
  pageLineCount?: number | null;
};

export type GetActivityHistoryDependencies = {
  learnerRepository: {
    findById(id: string, userId: string): Promise<unknown | null>;
  };
  activityAyahTraceRepository: {
    findHistoryByLearnerId(learnerId: string): Promise<ActivityHistoryTrace[]>;
  };
};

export async function getActivityHistory(
  userId: string,
  learnerId: string,
  dependencies: GetActivityHistoryDependencies,
) {
  if (!userId.trim()) throw new Error("User id is required");
  if (!learnerId.trim()) throw new Error("Learner id is required");

  const learner = await dependencies.learnerRepository.findById(
    learnerId,
    userId,
  );

  if (learner === null) throw new Error("Learner not found");

  const traces =
    await dependencies.activityAyahTraceRepository.findHistoryByLearnerId(
      learnerId,
    );

  return {
    learnerId,
    records: traces.map((trace) => ({
      activityId: trace.activityId,
      ayahId: trace.ayahId,
      status: trace.status,
      action: trace.action,
      ayahNumber: trace.ayahNumber,
      surahNumber: trace.surahNumber,
      pageNumber: trace.pageNumber,
      ...(trace.lineNumbers !== undefined
        ? { lineNumbers: trace.lineNumbers }
        : {}),
      ...(trace.pageLineCount !== undefined
        ? { pageLineCount: trace.pageLineCount }
        : {}),
      occurredAt: (
        trace.recordedAt ??
        trace.endedAt ??
        trace.resultCreatedAt ??
        trace.startedAt
      ).toISOString(),
      startedAt: trace.startedAt.toISOString(),
    })),
  };
}

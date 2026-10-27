import type { LearningGoalAction } from "../types";

export type GetSurahHistoryTrace = {
  activityId: string;
  ayahId: number;
  ayahNumber: number;
  pageNumber: number;
  action: LearningGoalAction;
  recordedAt: Date | null;
  startedAt: Date;
  endedAt: Date | null;
  resultCreatedAt: Date | null;
};

export type GetSurahHistoryDependencies = {
  learnerRepository: {
    findById(id: string, userId: string): Promise<unknown | null>;
  };
  activityAyahTraceRepository: {
    findCompletedByLearnerIdForSurah(
      learnerId: string,
      surahNumber: number,
    ): Promise<GetSurahHistoryTrace[]>;
  };
};

const ACTION_ORDER: LearningGoalAction[] = [
  "read",
  "listen",
  "recite",
  "memorize",
  "revise",
  "tajwid",
  "tadabbur",
  "talkin",
  "tathbit",
];

export async function getSurahHistory(
  userId: string,
  learnerId: string,
  surahNumber: number,
  dependencies: GetSurahHistoryDependencies,
): Promise<{
  learnerId: string;
  surahNumber: number;
  items: {
    action: LearningGoalAction;
    count: number;
    lastPerformedAt: string;
  }[];
}> {
  if (!userId.trim()) {
    throw new Error("User id is required");
  }

  if (!learnerId.trim()) {
    throw new Error("Learner id is required");
  }

  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    throw new Error("Surah number must be between 1 and 114");
  }

  const learner = await dependencies.learnerRepository.findById(
    learnerId,
    userId,
  );

  if (learner === null) {
    throw new Error("Learner not found");
  }

  const traces =
    await dependencies.activityAyahTraceRepository.findCompletedByLearnerIdForSurah(
      learnerId,
      surahNumber,
    );

  // Une même activité peut comporter de nombreux versets.
  // Elle ne doit compter qu'une fois pour une sourate et un mode donnés.
  const sessionsByAction = new Map<LearningGoalAction, Map<string, Date>>();

  for (const trace of traces) {
    const performedAt =
      trace.recordedAt ??
      trace.endedAt ??
      trace.resultCreatedAt ??
      trace.startedAt;

    let sessions = sessionsByAction.get(trace.action);

    if (!sessions) {
      sessions = new Map<string, Date>();
      sessionsByAction.set(trace.action, sessions);
    }

    const previousDate = sessions.get(trace.activityId);

    if (!previousDate || performedAt > previousDate) {
      sessions.set(trace.activityId, performedAt);
    }
  }

  const items = Array.from(sessionsByAction.entries())
    .map(([action, sessions]) => {
      const dates = Array.from(sessions.values());
      const latestDate = dates.reduce(
        (latest, date) => (date > latest ? date : latest),
        dates[0],
      );

      return {
        action,
        count: sessions.size,
        lastPerformedAt: latestDate.toISOString(),
      };
    })
    .sort(
      (a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action),
    );

  return {
    learnerId,
    surahNumber,
    items,
  };
}

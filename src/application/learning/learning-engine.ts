import {
  ActivityRepository,
  ActivityAyahTraceRepository,
  ActivityResultRepository,
  GoalRepository,
  LearnerRepository,
  ProgressRecordRepository,
} from "@irtaki/persistence";

import { createLearningActivityRepository } from "./adapters/activity-repository";
import { createLearningActivityResultRepository } from "./adapters/activity-result-repository";
import { createLearningGoalRepository } from "./adapters/goal-repository";
import { createLearningLearnerRepository } from "./adapters/learner-repository";
import { createLearningProgressRecordRepository } from "./adapters/progress-record-repository";

import { createGoal } from "./use-cases/create-goal";
import { getNextWork } from "./use-cases/get-next-work";
import { getProgress } from "./use-cases/get-progress";
import { recordActivityResult } from "./use-cases/record-activity-result";
import { recordActivityAyahTraces } from "./use-cases/record-activity-ayah-traces";
import { startActivity } from "./use-cases/start-activity";
import { getSurahHistory as getSurahHistoryUseCase } from "./use-cases/get-surah-history";
import { getActivityHistory as getActivityHistoryUseCase } from "./use-cases/get-activity-history";

export function createLearningEngine() {
  const learnerRepository = createLearningLearnerRepository(
    new LearnerRepository(),
  );

  const goalRepository = createLearningGoalRepository(new GoalRepository());

  const activityRepository = createLearningActivityRepository(
    new ActivityRepository(),
  );

  const activityAyahTraceRepository = new ActivityAyahTraceRepository();

  const activityResultRepository = createLearningActivityResultRepository(
    new ActivityResultRepository(),
  );

  const progressRecordRepository = createLearningProgressRecordRepository(
    new ProgressRecordRepository(),
  );

  return {
    createGoal: (userId: string, input: Parameters<typeof createGoal>[1]) =>
      createGoal(userId, input, {
        learnerRepository,
        goalRepository,
      }),

    startActivity: (
      userId: string,
      input: Parameters<typeof startActivity>[1],
    ) =>
      startActivity(userId, input, {
        learnerRepository,
        goalRepository,
        activityRepository,
      }),

    recordActivityAyahTraces: (
      userId: string,
      input: Parameters<typeof recordActivityAyahTraces>[1],
    ) =>
      recordActivityAyahTraces(userId, input, {
        learnerRepository,
        activityRepository,
        activityAyahTraceRepository,
      }),

    recordActivityResult: (
      learnerId: string,
      input: Parameters<typeof recordActivityResult>[1],
      recordedAt?: Date,
    ) =>
      recordActivityResult(
        learnerId,
        input,
        {
          activityRepository,
          goalRepository,
          activityResultRepository,
          progressRecordRepository,
        },
        recordedAt,
      ),

    getHistoryLearners: (userId: string) =>
      learnerRepository.findManyByUserId(userId),

    getSurahHistory: (userId: string, learnerId: string, surahNumber: number) =>
      getSurahHistoryUseCase(userId, learnerId, surahNumber, {
        learnerRepository,
        activityAyahTraceRepository,
      }),

    getActivityHistory: (userId: string, learnerId: string) =>
      getActivityHistoryUseCase(userId, learnerId, {
        learnerRepository,
        activityAyahTraceRepository,
      }),

    getProgress: (learnerId: string, goalId: string, now: Date) =>
      getProgress(learnerId, goalId, now, {
        goalRepository,
        progressRecordRepository,
      }),

    getNextWork: (learnerId: string, now: Date) =>
      getNextWork(learnerId, now, {
        goalRepository,
        progressRecordRepository,
      }),
  };
}

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
import { finishActivity as finishActivityUseCase } from "./use-cases/finish-activity";
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
    listGoals: async (userId: string, learnerId: string) => {
      const learner = await learnerRepository.findById(learnerId, userId);

      if (!learner) {
        throw new Error("Learner not found");
      }

      return goalRepository.findManyByLearnerId(learnerId);
    },

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

    getActivityGoal: async (
      userId: string,
      learnerId: string,
      activityId: string,
    ) => {
      const learner = await learnerRepository.findById(learnerId, userId);

      if (!learner) {
        throw new Error("Learner not found");
      }

      const activity = await activityRepository.findById(
        activityId,
        learnerId,
      );

      if (!activity) {
        throw new Error("Activity not found");
      }

      const goalId = (activity as { goalId?: string | null }).goalId;

      if (!goalId) {
        return null;
      }

      return goalRepository.findById(goalId, learnerId);
    },

    getActivityContext: async (
      userId: string,
      learnerId: string,
      activityId: string,
    ) => {
      const learner = await learnerRepository.findById(learnerId, userId);

      if (!learner) {
        throw new Error("Learner not found");
      }

      const activity = await activityRepository.findById(
        activityId,
        learnerId,
      );

      if (!activity) {
        throw new Error("Activity not found");
      }

      const goalId = activity.goalId ?? null;
      const goal = goalId
        ? await goalRepository.findById(goalId, learnerId)
        : null;

      return {
        id: activity.id,
        action: activity.action,
        startedAt: activity.startedAt,
        goalId,
        goal,
      };
    },

    recordActivityAyahTraces: (
      userId: string,
      input: Parameters<typeof recordActivityAyahTraces>[1],
    ) =>
      recordActivityAyahTraces(userId, input, {
        learnerRepository,
        activityRepository,
        activityAyahTraceRepository,
      }),

    recordAdditionalGoalProgress: async (
      userId: string,
      learnerId: string,
      goalId: string,
      input: {
        activityId: string;
        quantity: number;
        unit: "ayah" | "page";
      },
      recordedAt = new Date(),
    ) => {
      const learner = await learnerRepository.findById(learnerId, userId);

      if (!learner) {
        throw new Error("Learner not found");
      }

      const activity = await activityRepository.findById(
        input.activityId,
        learnerId,
      );

      if (!activity) {
        throw new Error("Activity not found");
      }

      const goal = await goalRepository.findById(goalId, learnerId);

      if (!goal) {
        throw new Error("Goal not found");
      }

      if (goal.unit !== input.unit) {
        throw new Error("Activity result unit does not match goal unit");
      }

      if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
        throw new Error("Progress quantity must be positive");
      }

      if (activity.goalId === goalId) {
        throw new Error(
          "Goal is already linked to this activity; use recordActivityResult",
        );
      }

      const existingRecords =
        await progressRecordRepository.findManyByActivityId(
          input.activityId,
          learnerId,
        );

      const existingForGoal = existingRecords.find(
        (record) => record.goalId === goalId,
      );

      if (existingForGoal) return existingForGoal;

      return progressRecordRepository.create({
        learnerId,
        goalId,
        activityId: input.activityId,
        recordedAt,
        quantity: input.quantity,
        unit: input.unit,
      });
    },

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

    finishActivity: (
      userId: string,
      input: Parameters<typeof finishActivityUseCase>[1],
      endedAt?: Date,
    ) =>
      finishActivityUseCase(
        userId,
        input,
        {
          learnerRepository,
          activityRepository,
          activityAyahTraceRepository,
        },
        endedAt,
      ),

    findUnknownAyahIds: (ayahIds: number[]) =>
      activityAyahTraceRepository.findUnknownAyahIds(ayahIds),

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

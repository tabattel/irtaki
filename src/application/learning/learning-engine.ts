import {
  ActivityRepository,
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
import { startActivity } from "./use-cases/start-activity";

export function createLearningEngine() {
  const learnerRepository = createLearningLearnerRepository(
    new LearnerRepository(),
  );

  const goalRepository = createLearningGoalRepository(new GoalRepository());

  const activityRepository = createLearningActivityRepository(
    new ActivityRepository(),
  );

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

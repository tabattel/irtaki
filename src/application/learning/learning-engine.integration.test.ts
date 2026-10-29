import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ActivityResultRepository,
  GoalRepository,
  GoalTargetRepository,
  LearnerRepository,
  ProgressRecordRepository,
  UserRepository,
  prisma,
} from "@irtaki/persistence";
import { createLearningEngine } from "./learning-engine";
import { createLearningGoalRepository } from "./adapters/goal-repository";
import type { LearningGoal } from "./types";

describe("learning engine integration", () => {
  const engine = createLearningEngine();
  const goalRepository = new GoalRepository();
  const learningGoalRepository = createLearningGoalRepository(goalRepository);
  const userRepository = new UserRepository();
  const learnerRepository = new LearnerRepository();
  const goalTargetRepository = new GoalTargetRepository();

  let userId: string;
  let learnerId: string;
  let goalId: string;
  let activityId: string;

  const now = new Date("2026-09-23T20:00:00.000Z");

  beforeAll(async () => {
    const user = await userRepository.create({
      email: `learning-engine-${Date.now()}@irtaki.test`,
      name: "Learning Engine Integration",
    });

    userId = user.id;

    const learner = await learnerRepository.create({
      userId,
      name: "Learning Engine Learner",
    });

    learnerId = learner.id;
  });

  it("creates a goal through the learning engine", async () => {
    const goal = await engine.createGoal(userId, {
      learnerId,
      title: "Mémoriser une page par jour",
      description: "Test d'intégration",
      action: "memorize",
      quantity: 1,
      unit: "page",
      frequencyCount: 1,
      frequencyPeriod: "day",
      startDate: new Date("2026-09-23T00:00:00.000Z"),
      target: {
        scope: "page_range",
        startValue: "1",
        endValue: "5",
      },
      status: "active",
    });

    expect(goal).toMatchObject({
      learnerId,
      title: "Mémoriser une page par jour",
      action: "memorize",
      unit: "page",
      target: {
        scope: "page_range",
        startValue: "1",
        endValue: "5",
      },
    });

    goalId = (goal as { id: string }).id;
    expect(goalId).toBeTruthy();

    const persistedTarget =
      await goalTargetRepository.findByGoalId(goalId);

    expect(persistedTarget).toMatchObject({
      goalId,
      scope: "page_range",
      startValue: "1",
      endValue: "5",
    });

    const reloadedGoal = await goalRepository.findById(goalId, learnerId);
    expect(reloadedGoal?.target).toMatchObject({
      goalId,
      scope: "page_range",
      startValue: "1",
      endValue: "5",
    });

    const mappedGoal = await learningGoalRepository.findById(
      goalId,
      learnerId,
    );
    expect(mappedGoal?.target).toMatchObject({
      scope: "page_range",
      startValue: "1",
      endValue: "5",
    });

    const listedGoals: LearningGoal[] =
      await learningGoalRepository.findManyByLearnerId(learnerId);
    const listedGoal = listedGoals.find((item: { id: string }) => item.id === goalId);
    expect(listedGoal?.target).toMatchObject({
      scope: "page_range",
      startValue: "1",
      endValue: "5",
    });

    const mainGoal = (
      await goalRepository.findMainGoalsByLearnerId(learnerId)
    ).find((item: { id: string }) => item.id === goalId);
    expect(mainGoal?.target).toMatchObject({
      scope: "page_range",
      startValue: "1",
      endValue: "5",
    });
  });

  it("starts an activity linked to the goal", async () => {
    const activity = await engine.startActivity(userId, {
      learnerId,
      goalId,
      action: "memorize",
      startedAt: new Date("2026-09-23T18:00:00.000Z"),
      endedAt: new Date("2026-09-23T18:30:00.000Z"),
      durationSec: 1800,
      notes: "Séance d'intégration",
    });

    expect(activity).toMatchObject({
      learnerId,
      goalId,
      action: "memorize",
      durationSec: 1800,
    });

    activityId = (activity as { id: string }).id;
    expect(activityId).toBeTruthy();
  });

  it("records the activity result and creates progress", async () => {
    const result = await engine.recordActivityResult(
      learnerId,
      {
        activityId,
        status: "completed",
        quantity: 1,
        unit: "page",
      },
      new Date("2026-09-23T18:30:00.000Z"),
    );

    expect(result.activityResult).toMatchObject({
      activityId,
      status: "completed",
      unit: "page",
    });

    expect(result.progressRecord).toMatchObject({
      learnerId,
      goalId,
      activityId,
      unit: "page",
    });
  });

  it("calculates the persisted progress", async () => {
    const progress = await engine.getProgress(learnerId, goalId, now);

    expect(progress.targetQuantity).toBe(1);
    expect(progress.achievedQuantity).toBe(1);
    expect(progress.achievedActivityCount).toBe(1);
    expect(progress.quantityProgress).toBe(100);
    expect(progress.activityProgress).toBe(100);
    expect(progress.progressPercent).toBe(100);
    expect(progress.remainingQuantity).toBe(0);
    expect(progress.remainingActivityCount).toBe(0);
  });

  it("does not return an achieved goal as next work", async () => {
    const nextWork = await engine.getNextWork(learnerId, now);

    expect(nextWork).toEqual([]);
  });

  it("rolls back the activity result when progress creation fails", async () => {
    const rollbackActivity = await engine.startActivity(userId, {
      learnerId,
      goalId,
      action: "memorize",
      startedAt: new Date("2026-09-23T19:00:00.000Z"),
      notes: "Test transaction rollback",
    });

    const rollbackActivityId = (
      rollbackActivity as { id: string }
    ).id;

    expect(rollbackActivityId).toBeTruthy();

    const activityResultRepository = new ActivityResultRepository();

    await expect(
      activityResultRepository.createWithProgress(
        {
          activityId: rollbackActivityId,
          status: "completed",
          quantity: 1,
          unit: "page",
        },
        {
          learnerId,
          // Cet identifiant volontairement inexistant doit faire échouer
          // l'insertion ProgressRecord sur sa clé étrangère.
          goalId: "missing-goal-for-rollback-test",
          activityId: rollbackActivityId,
          recordedAt: new Date("2026-09-23T19:30:00.000Z"),
          quantity: 1,
          unit: "page",
        },
      ),
    ).rejects.toThrow();

    // Le résultat créé avant l'échec doit avoir été annulé.
    expect(
      await activityResultRepository.findByActivityId(rollbackActivityId),
    ).toBeNull();

    // Aucune progression ne doit être présente pour cette activité.
    const progressRecordRepository = new ProgressRecordRepository();
    const progressRecords =
      await progressRecordRepository.findManyByActivityId(
        rollbackActivityId,
        learnerId,
      );

    expect(progressRecords).toHaveLength(0);
  });

  afterAll(async () => {
    await learnerRepository.delete(learnerId, userId);

    await prisma.$executeRaw`
      DELETE FROM "User"
      WHERE "id" = ${userId}
    `;
  });
});

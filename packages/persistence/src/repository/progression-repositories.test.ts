import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../client/prisma";
import {
  ActivityRepository,
  ActivityResultRepository,
  GoalRepository,
  GoalTargetRepository,
  LearnerRepository,
  ProgressRecordRepository,
} from "../index";

describe("progression repositories", () => {
  const learnerRepository = new LearnerRepository();
  const goalRepository = new GoalRepository();
  const goalTargetRepository = new GoalTargetRepository();
  const activityRepository = new ActivityRepository();
  const activityResultRepository = new ActivityResultRepository();
  const progressRecordRepository = new ProgressRecordRepository();

  let userId: string;
  let learnerId: string;
  let goalId: string;
  let subGoalId: string;
  let activityId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `progression-test-${Date.now()}@irtaki.test`,
        name: "Progression Test",
      },
    });

    userId = user.id;

    const learner = await learnerRepository.create({
      userId,
      name: "Learner Test",
    });

    learnerId = learner.id;
  });

  it("creates and retrieves a learner", async () => {
    const learner = await learnerRepository.findById(
      learnerId,
      userId,
    );

    expect(learner).not.toBeNull();
    expect(learner?.id).toBe(learnerId);
    expect(learner?.userId).toBe(userId);
    expect(learner?.name).toBe("Learner Test");
  });

  it("creates a main goal", async () => {
    const goal = await goalRepository.create({
      learnerId,
      title: "Mémoriser le Coran en un an",
      description: "Objectif principal de mémorisation",
      action: "memorize",
      quantity: 0.5,
      unit: "page",
      frequencyCount: 1,
      frequencyPeriod: "day",
      startDate: new Date("2026-09-20T00:00:00.000Z"),
      endDate: new Date("2027-09-20T00:00:00.000Z"),
      status: "active",
      notificationEnabled: true,
      notificationTime: "20:00",
    });

    goalId = goal.id;

    expect(goal.learnerId).toBe(learnerId);
    expect(goal.title).toBe("Mémoriser le Coran en un an");
    expect(goal.action).toBe("memorize");
    expect(Number(goal.quantity)).toBe(0.5);
    expect(goal.unit).toBe("page");
  });

  it("supports nisf and roboa progression units and target scopes", async () => {
    const testUser = await prisma.user.create({
      data: {
        email: `progression-units-${Date.now()}@irtaki.test`,
        name: "Progression Units Test",
      },
    });

    const testLearner = await learnerRepository.create({
      userId: testUser.id,
      name: "Progression Units Learner",
    });

    const nisfGoal = await goalRepository.create({
      learnerId: testLearner.id,
      title: "Mémoriser un nisf",
      action: "memorize",
      quantity: 1,
      unit: "nisf",
      frequencyCount: 1,
      frequencyPeriod: "week",
      startDate: new Date("2026-09-20T00:00:00.000Z"),
      status: "active",
    });

    const roboaGoal = await goalRepository.create({
      learnerId: testLearner.id,
      title: "Mémoriser un roboa",
      action: "memorize",
      quantity: 1,
      unit: "roboa",
      frequencyCount: 1,
      frequencyPeriod: "week",
      startDate: new Date("2026-09-20T00:00:00.000Z"),
      status: "active",
    });

    const nisfTarget = await goalTargetRepository.create({
      goalId: nisfGoal.id,
      scope: "nisf",
    });

    const roboaTarget = await goalTargetRepository.create({
      goalId: roboaGoal.id,
      scope: "roboa",
    });

    expect(nisfGoal.unit).toBe("nisf");
    expect(roboaGoal.unit).toBe("roboa");
    expect(nisfTarget.scope).toBe("nisf");
    expect(roboaTarget.scope).toBe("roboa");

    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  it("creates and retrieves a goal target", async () => {
    const target = await goalTargetRepository.create({
      goalId,
      scope: "quran",
    });

    expect(target.goalId).toBe(goalId);
    expect(target.scope).toBe("quran");

    await expect(
      goalTargetRepository.findByGoalId(goalId),
    ).resolves.toMatchObject({
      goalId,
      scope: "quran",
    });
  });

  it("supports main goals and sub-goals", async () => {
    const subGoal = await goalRepository.create({
      learnerId,
      parentGoalId: goalId,
      title: "Mémoriser Juz Amma",
      action: "memorize",
      quantity: 1,
      unit: "juz",
      frequencyCount: 1,
      frequencyPeriod: "month",
      startDate: new Date("2026-09-20T00:00:00.000Z"),
      status: "active",
    });

    subGoalId = subGoal.id;

    await expect(
      goalRepository.findById(subGoalId, learnerId),
    ).resolves.toMatchObject({
      id: subGoalId,
      parentGoalId: goalId,
    });

    await expect(
      goalRepository.findMainGoalsByLearnerId(learnerId),
    ).resolves.toHaveLength(1);

    await expect(
      goalRepository.findSubGoals(goalId),
    ).resolves.toHaveLength(1);
  });

  it("creates an activity and its result", async () => {
    const startedAt = new Date("2026-09-20T18:00:00.000Z");
    const endedAt = new Date("2026-09-20T18:30:00.000Z");

    const activity = await activityRepository.create({
      learnerId,
      goalId,
      action: "memorize",
      startedAt,
      endedAt,
      durationSec: 1800,
      notes: "Séance de mémorisation",
    });

    activityId = activity.id;

    expect(activity.learnerId).toBe(learnerId);
    expect(activity.goalId).toBe(goalId);
    expect(activity.durationSec).toBe(1800);

    const result = await activityResultRepository.create({
      activityId,
      status: "completed",
      quantity: 0.5,
      unit: "page",
    });

    expect(result.activityId).toBe(activityId);
    expect(result.status).toBe("completed");
    expect(Number(result.quantity)).toBe(0.5);
    expect(result.unit).toBe("page");

    await expect(
      activityResultRepository.findByActivityId(activityId),
    ).resolves.toMatchObject({
      activityId,
      status: "completed",
      unit: "page",
    });
  });

  it("creates progress records linked to the goal and activity", async () => {
    const progress = await progressRecordRepository.create({
      learnerId,
      goalId,
      activityId,
      recordedAt: new Date("2026-09-20T18:30:00.000Z"),
      quantity: 0.5,
      unit: "page",
    });

    expect(progress.learnerId).toBe(learnerId);
    expect(progress.goalId).toBe(goalId);
    expect(progress.activityId).toBe(activityId);
    expect(Number(progress.quantity)).toBe(0.5);
    expect(progress.unit).toBe("page");

    await expect(
      progressRecordRepository.findManyByLearnerId(learnerId),
    ).resolves.toHaveLength(1);

    await expect(
      progressRecordRepository.findManyByGoalId(goalId, learnerId),
    ).resolves.toHaveLength(1);

    await expect(
      progressRecordRepository.findManyByActivityId(
        activityId,
        learnerId,
      ),
    ).resolves.toHaveLength(1);
  });

  it("isolates goals, activities and progress by learner", async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: `progression-other-${Date.now()}@irtaki.test`,
        name: "Other User",
      },
    });

    const otherLearner = await learnerRepository.create({
      userId: otherUser.id,
      name: "Other Learner",
    });

    await expect(
      goalRepository.findById(goalId, otherLearner.id),
    ).resolves.toBeNull();

    await expect(
      activityRepository.findById(activityId, otherLearner.id),
    ).resolves.toBeNull();

    await expect(
      progressRecordRepository.findManyByGoalId(
        goalId,
        otherLearner.id,
      ),
    ).resolves.toEqual([]);

    await prisma.user.delete({
      where: { id: otherUser.id },
    });
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({
        where: { id: userId },
      });
    }

    await prisma.$disconnect();
  });
});

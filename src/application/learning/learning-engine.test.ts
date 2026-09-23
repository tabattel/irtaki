import { describe, expect, it } from "vitest";
import {
  getPeriodEnd,
  getPeriodStart,
  isGoalActiveAt,
  isScheduledAt,
} from "./goal-scheduler";
import { calculateProgress } from "./progress-calculator";
import { evaluateGoalState } from "./goal-status-evaluator";
import { resolveNextWork } from "./next-work-resolver";
import type { LearningGoal } from "./types";

const goal: LearningGoal = {
  id: "goal-1",
  title: "Mémoriser 10 pages",
  action: "memorize",
  quantity: 10,
  unit: "page",
  frequencyCount: 2,
  frequencyPeriod: "week",
  intervalDays: null,
  weekday: null,
  startDate: new Date("2026-09-01T00:00:00.000Z"),
  endDate: null,
  status: "active",
};

describe("Learning Engine", () => {
  const now = new Date("2026-09-23T12:00:00.000Z");

  it("calcule correctement le début et la fin d'une semaine", () => {
    expect(getPeriodStart("week", now)).toEqual(
      new Date("2026-09-21T00:00:00.000Z"),
    );

    expect(getPeriodEnd("week", now)).toEqual(
      new Date("2026-09-27T23:59:59.999Z"),
    );
  });

  it("détermine si un objectif est actif", () => {
    expect(isGoalActiveAt(goal, now)).toBe(true);

    expect(isGoalActiveAt(goal, new Date("2026-08-31T23:59:59.000Z"))).toBe(
      false,
    );
  });

  it("respecte weekday et intervalDays", () => {
    const weekdayGoal = {
      ...goal,
      weekday: "wednesday" as const,
    };

    expect(isScheduledAt(weekdayGoal, now)).toBe(true);

    const intervalGoal = {
      ...goal,
      intervalDays: 3,
    };

    expect(
      isScheduledAt(intervalGoal, now, new Date("2026-09-22T12:00:00.000Z")),
    ).toBe(false);

    expect(
      isScheduledAt(intervalGoal, now, new Date("2026-09-19T12:00:00.000Z")),
    ).toBe(true);
  });

  it("calcule la progression quantitative et par activité", () => {
    const progress = calculateProgress(
      goal,
      [
        {
          recordedAt: new Date("2026-09-22T10:00:00.000Z"),
          quantity: 4,
          status: "completed",
        },
        {
          recordedAt: new Date("2026-09-23T10:00:00.000Z"),
          quantity: 3,
          status: "partial",
        },
      ],
      now,
    );

    expect(progress.achievedQuantity).toBe(7);
    expect(progress.achievedActivityCount).toBe(2);
    expect(progress.quantityProgress).toBe(70);
    expect(progress.activityProgress).toBe(100);
    expect(progress.progressPercent).toBe(70);
    expect(progress.remainingQuantity).toBe(3);
    expect(progress.remainingActivityCount).toBe(0);
  });

  it("ignore les activités failed et skipped", () => {
    const progress = calculateProgress(
      goal,
      [
        {
          recordedAt: new Date("2026-09-22T10:00:00.000Z"),
          quantity: 10,
          status: "failed",
        },
        {
          recordedAt: new Date("2026-09-23T10:00:00.000Z"),
          quantity: 10,
          status: "skipped",
        },
      ],
      now,
    );

    expect(progress.achievedQuantity).toBe(0);
    expect(progress.achievedActivityCount).toBe(0);
    expect(progress.progressPercent).toBe(0);
  });

  it("détermine l'état achieved", () => {
    const records = [
      {
        recordedAt: new Date("2026-09-22T10:00:00.000Z"),
        quantity: 5,
        status: "completed" as const,
      },
      {
        recordedAt: new Date("2026-09-23T10:00:00.000Z"),
        quantity: 5,
        status: "completed" as const,
      },
    ];

    expect(evaluateGoalState(goal, records, now)).toBe("achieved");
  });

  it("détermine l'état in_progress", () => {
    expect(
      evaluateGoalState(
        goal,
        [
          {
            recordedAt: new Date("2026-09-23T10:00:00.000Z"),
            quantity: 3,
            status: "partial",
          },
        ],
        now,
      ),
    ).toBe("in_progress");
  });

  it("détermine le prochain travail de manière déterministe", () => {
    const secondGoal: LearningGoal = {
      ...goal,
      id: "goal-2",
      title: "Mémoriser 5 pages",
      quantity: 5,
      unit: "page",
      frequencyCount: 1,
    };

    const result = resolveNextWork(
      [goal, secondGoal],
      new Map([
        [
          "goal-1",
          [
            {
              recordedAt: new Date("2026-09-23T10:00:00.000Z"),
              quantity: 3,
              status: "partial",
            },
          ],
        ],
        ["goal-2", []],
      ]),
      now,
    );

    expect(result).toEqual([
      {
        goalId: "goal-2",
        title: "Mémoriser 5 pages",
        quantity: 5,
        unit: "page",
        activityCount: 1,
        reason: "not_started",
      },
      {
        goalId: "goal-1",
        title: "Mémoriser 10 pages",
        quantity: 7,
        unit: "page",
        activityCount: 1,
        reason: "in_progress",
      },
    ]);
  });
});

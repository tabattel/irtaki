import { calculateProgress } from "./progress-calculator";
import { isGoalActiveAt } from "./goal-scheduler";
import type { LearningGoal, LearningProgressRecord, NextWork } from "./types";

export function resolveNextWork(
  goals: LearningGoal[],
  recordsByGoalId: Map<string, LearningProgressRecord[]>,
  now: Date,
): NextWork[] {
  return goals
    .filter((goal) => isGoalActiveAt(goal, now))
    .map((goal) => {
      const progress = calculateProgress(
        goal,
        recordsByGoalId.get(goal.id) ?? [],
        now,
      );

      return {
        goal,
        progress,
      };
    })
    .filter(({ progress }) => progress.progressPercent < 100)
    .sort((a, b) => {
      const progressDifference =
        a.progress.progressPercent - b.progress.progressPercent;

      if (progressDifference !== 0) {
        return progressDifference;
      }

      const dateDifference =
        a.goal.startDate.getTime() - b.goal.startDate.getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return a.goal.id.localeCompare(b.goal.id);
    })
    .map(({ goal, progress }) => ({
      goalId: goal.id,
      title: goal.title,
      quantity: progress.remainingQuantity,
      unit: goal.unit,
      activityCount: progress.remainingActivityCount,
      reason:
        progress.achievedQuantity === 0 && progress.achievedActivityCount === 0
          ? "not_started"
          : "in_progress",
    }));
}

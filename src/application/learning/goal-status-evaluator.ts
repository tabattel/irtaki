import { isGoalActiveAt } from "./goal-scheduler";
import { calculateProgress } from "./progress-calculator";
import type {
  LearningGoal,
  LearningGoalState,
  LearningProgressRecord,
} from "./types";

export function evaluateGoalState(
  goal: LearningGoal,
  records: LearningProgressRecord[],
  now: Date,
): LearningGoalState {
  if (!isGoalActiveAt(goal, now)) {
    if (goal.endDate !== null && now > goal.endDate) {
      return "overdue";
    }

    return "not_started";
  }

  const progress = calculateProgress(goal, records, now);

  if (progress.progressPercent >= 100) {
    return "achieved";
  }

  if (progress.achievedQuantity > 0 || progress.achievedActivityCount > 0) {
    return "in_progress";
  }

  return "not_started";
}

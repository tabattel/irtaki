import { isGoalActiveAt } from "./goal-scheduler";
import type { LearningGoal } from "./types";

function actionsAreCompatible(
  goalAction: string,
  activityAction: string,
): boolean {
  if (goalAction === activityAction) return true;

  return (
    (goalAction === "read" || goalAction === "qiraa") &&
    (activityAction === "read" || activityAction === "qiraa")
  );
}

export function selectCompatibleProgressGoals(
  goals: readonly LearningGoal[],
  activityAction: string,
  at: Date,
  pageFraction: number | null,
): LearningGoal[] {
  return goals
    .filter((goal) => {
      if (!isGoalActiveAt(goal, at)) return false;
      if (!actionsAreCompatible(goal.action, activityAction)) return false;

      if (goal.unit === "ayah") return true;
      if (goal.unit === "page") return pageFraction !== null;

      return false;
    })
    .slice()
    .sort((a, b) => {
      const exactActionOrder =
        Number(b.action === activityAction) -
        Number(a.action === activityAction);

      if (exactActionOrder !== 0) return exactActionOrder;

      const unitOrder =
        Number(b.unit === "page") - Number(a.unit === "page");

      if (unitOrder !== 0) return unitOrder;

      return a.id.localeCompare(b.id);
    });
}

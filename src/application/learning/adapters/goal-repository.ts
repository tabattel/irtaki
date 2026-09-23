import type { GoalRepository } from "@irtaki/persistence";
import type {
  LearningGoal,
  LearningGoalAction,
  LearningGoalStatus,
  LearningFrequencyPeriod,
  LearningProgressUnit,
  LearningWeekday,
} from "../types";

type PersistenceGoal = Awaited<ReturnType<GoalRepository["findById"]>>;

function mapGoal(goal: NonNullable<PersistenceGoal>): LearningGoal {
  return {
    id: goal.id,
    title: goal.title,
    action: goal.action as LearningGoalAction,
    quantity: goal.quantity.toString(),
    unit: goal.unit as LearningProgressUnit,
    frequencyCount: goal.frequencyCount,
    frequencyPeriod: goal.frequencyPeriod as LearningFrequencyPeriod,
    intervalDays: goal.intervalDays,
    weekday: goal.weekday as LearningWeekday | null,
    startDate: goal.startDate,
    endDate: goal.endDate,
    status: goal.status as LearningGoalStatus,
  };
}

export function createLearningGoalRepository(repository: GoalRepository) {
  return {
    async create(input: Parameters<GoalRepository["create"]>[0]) {
      return repository.create(input);
    },

    async findById(
      id: string,
      learnerId: string,
    ): Promise<LearningGoal | null> {
      const goal = await repository.findById(id, learnerId);

      return goal === null ? null : mapGoal(goal);
    },

    async findManyByLearnerId(learnerId: string): Promise<LearningGoal[]> {
      const goals = await repository.findManyByLearnerId(learnerId);

      return goals.map(mapGoal);
    },
  };
}

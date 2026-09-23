import type {
  LearningFrequencyPeriod,
  LearningGoalAction,
  LearningGoalStatus,
  LearningProgressUnit,
  LearningWeekday,
} from "../types";

export type CreateGoalInput = {
  learnerId: string;
  parentGoalId?: string;
  title: string;
  description?: string;
  action: LearningGoalAction;
  quantity: string | number;
  unit: LearningProgressUnit;
  frequencyCount: number;
  frequencyPeriod: LearningFrequencyPeriod;
  intervalDays?: number;
  weekday?: LearningWeekday;
  startDate: Date;
  endDate?: Date;
  status?: LearningGoalStatus;
  notificationEnabled?: boolean;
  notificationTime?: string;
};

export type CreateGoalDependencies = {
  learnerRepository: {
    findById(id: string, userId: string): Promise<unknown | null>;
  };

  goalRepository: {
    create(input: CreateGoalInput): Promise<unknown>;
    findById(id: string, learnerId: string): Promise<unknown | null>;
  };
};

function validateQuantity(quantity: string | number): void {
  const value = Number(quantity);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Goal quantity must be greater than zero");
  }
}

function validateFrequencyCount(frequencyCount: number): void {
  if (!Number.isInteger(frequencyCount) || frequencyCount <= 0) {
    throw new Error("Goal frequencyCount must be greater than zero");
  }
}

function validateIntervalDays(intervalDays: number | undefined): void {
  if (
    intervalDays !== undefined &&
    (!Number.isInteger(intervalDays) || intervalDays <= 0)
  ) {
    throw new Error("Goal intervalDays must be greater than zero");
  }
}

function validateDates(startDate: Date, endDate: Date | undefined): void {
  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Goal startDate is invalid");
  }

  if (
    endDate !== undefined &&
    (Number.isNaN(endDate.getTime()) || endDate < startDate)
  ) {
    throw new Error("Goal endDate must be after startDate");
  }
}

function validateTitle(title: string): void {
  if (title.trim().length === 0) {
    throw new Error("Goal title is required");
  }
}

function validateNotificationTime(
  notificationEnabled: boolean | undefined,
  notificationTime: string | undefined,
): void {
  if (
    notificationTime !== undefined &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(notificationTime)
  ) {
    throw new Error("Goal notificationTime must use HH:mm format");
  }

  if (notificationEnabled === true && notificationTime === undefined) {
    throw new Error(
      "Goal notificationTime is required when notifications are enabled",
    );
  }
}

export async function createGoal(
  userId: string,
  input: CreateGoalInput,
  dependencies: CreateGoalDependencies,
): Promise<unknown> {
  if (input.learnerId.trim().length === 0) {
    throw new Error("Learner id is required");
  }

  validateTitle(input.title);
  validateQuantity(input.quantity);
  validateFrequencyCount(input.frequencyCount);
  validateIntervalDays(input.intervalDays);
  validateDates(input.startDate, input.endDate);
  validateNotificationTime(input.notificationEnabled, input.notificationTime);

  const learner = await dependencies.learnerRepository.findById(
    input.learnerId,
    userId,
  );

  if (learner === null) {
    throw new Error("Learner not found");
  }

  if (input.parentGoalId !== undefined) {
    const parentGoal = await dependencies.goalRepository.findById(
      input.parentGoalId,
      input.learnerId,
    );

    if (parentGoal === null) {
      throw new Error("Parent goal not found");
    }
  }

  return dependencies.goalRepository.create(input);
}

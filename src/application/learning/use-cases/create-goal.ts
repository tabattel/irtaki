import type {
  LearningFrequencyPeriod,
  LearningGoalAction,
  LearningGoalStatus,
  LearningProgressUnit,
  LearningWeekday,
  LearningGoalTargetScope,
} from "../types";

export type CreateGoalTargetInput = {
  scope: LearningGoalTargetScope;
  startValue?: string;
  endValue?: string;
};

export type CreateGoalInput = {
  learnerId: string;
  parentGoalId?: string;
  target?: CreateGoalTargetInput;
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

const GOAL_TARGET_SCOPES: readonly LearningGoalTargetScope[] = [
  "quran",
  "surah",
  "juz",
  "hizb",
  "nisf",
  "roboa",
  "page",
  "page_range",
  "ayah",
  "ayah_range",
];

function validateGoalTarget(target: CreateGoalTargetInput | undefined): void {
  if (target === undefined) {
    return;
  }

  if (target === null || typeof target !== "object") {
    throw new Error("Goal target is invalid");
  }

  if (!GOAL_TARGET_SCOPES.includes(target.scope)) {
    throw new Error("Goal target scope is invalid");
  }

  for (const value of [target.startValue, target.endValue]) {
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim().length === 0)
    ) {
      throw new Error("Goal target values must be non-empty strings");
    }
  }

  const isRange =
    target.scope === "page_range" || target.scope === "ayah_range";

  if (!isRange) {
    return;
  }

  if (target.startValue === undefined || target.endValue === undefined) {
    throw new Error("Goal target range requires startValue and endValue");
  }

  const startValue = Number(target.startValue);
  const endValue = Number(target.endValue);

  if (
    !Number.isSafeInteger(startValue) ||
    startValue <= 0 ||
    !Number.isSafeInteger(endValue) ||
    endValue <= 0
  ) {
    throw new Error("Goal target range values must be positive integers");
  }

  if (startValue > endValue) {
    throw new Error("Goal target startValue must not exceed endValue");
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
  validateGoalTarget(input.target);

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

import type {
  LearningFrequencyPeriod,
  LearningGoal,
  LearningWeekday,
} from "./types";

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfDay(date: Date): Date {
  const result = startOfDay(date);
  result.setUTCDate(result.getUTCDate() + 1);
  result.setUTCMilliseconds(-1);
  return result;
}

function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  const day = result.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + mondayOffset);
  return result;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function getPeriodStart(
  period: LearningFrequencyPeriod,
  date: Date,
): Date {
  switch (period) {
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date);
    case "month":
      return startOfMonth(date);
  }
}

export function getPeriodEnd(
  period: LearningFrequencyPeriod,
  date: Date,
): Date {
  switch (period) {
    case "day":
      return endOfDay(date);

    case "week": {
      const result = startOfWeek(date);
      result.setUTCDate(result.getUTCDate() + 7);
      result.setUTCMilliseconds(-1);
      return result;
    }

    case "month": {
      const result = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
      );
      result.setUTCMilliseconds(-1);
      return result;
    }
  }
}

export function isGoalActiveAt(goal: LearningGoal, date: Date): boolean {
  if (goal.status !== "active") {
    return false;
  }

  if (goal.startDate > date) {
    return false;
  }

  return goal.endDate === null || date <= goal.endDate;
}

export function isWeekdayAllowed(
  weekday: LearningWeekday | null,
  date: Date,
): boolean {
  if (weekday === null) {
    return true;
  }

  const weekdays: LearningWeekday[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return weekdays[date.getUTCDay()] === weekday;
}

export function isIntervalAllowed(
  intervalDays: number | null,
  lastActivityAt: Date | null,
  date: Date,
): boolean {
  if (intervalDays === null || lastActivityAt === null) {
    return true;
  }

  const elapsedMs = date.getTime() - lastActivityAt.getTime();
  const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);

  return elapsedDays >= intervalDays;
}

export function isScheduledAt(
  goal: LearningGoal,
  date: Date,
  lastActivityAt: Date | null = null,
): boolean {
  if (!isGoalActiveAt(goal, date)) {
    return false;
  }

  if (!isWeekdayAllowed(goal.weekday, date)) {
    return false;
  }

  return isIntervalAllowed(goal.intervalDays, lastActivityAt, date);
}

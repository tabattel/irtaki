export type LearningFrequencyPeriod = "day" | "week" | "month";

export type LearningGoalAction =
  | "read"
  | "listen"
  | "recite"
  | "memorize"
  | "revise"
  | "tajwid"
  | "tadabbur"
  | "talkin"
  | "tathbit"
  | "qiraa"
  | "khatma"
  | "tahajjud";

export type LearningGoalStatus =
  "draft" | "active" | "paused" | "completed" | "cancelled" | "archived";

export type LearningActivityResultStatus =
  "completed" | "partial" | "failed" | "skipped";

export type LearningActivityAyahTraceStatus =
  "started" | "completed" | "partial" | "failed" | "skipped";

export type LearningWeekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type LearningProgressUnit =
  "quran" | "surah" | "ayah" | "page" | "juz" | "hizb" | "nisf" | "roboa";

export type LearningGoalTargetScope =
  | "quran"
  | "surah"
  | "juz"
  | "hizb"
  | "nisf"
  | "roboa"
  | "page"
  | "page_range"
  | "ayah"
  | "ayah_range";

export type LearningGoalTarget = {
  scope: LearningGoalTargetScope;
  startValue: string | null;
  endValue: string | null;
};

export type LearningGoal = {
  id: string;
  title: string;
  target?: LearningGoalTarget | null;
  action: LearningGoalAction;
  quantity: string | number;
  unit: LearningProgressUnit;
  frequencyCount: number;
  frequencyPeriod: LearningFrequencyPeriod;
  intervalDays: number | null;
  weekday: LearningWeekday | null;
  startDate: Date;
  endDate: Date | null;
  status: LearningGoalStatus;
};

export type LearningProgressRecord = {
  recordedAt: Date;
  quantity: string | number;
  status?: LearningActivityResultStatus;
};

export type LearningProgress = {
  periodStart: Date;
  periodEnd: Date;
  targetQuantity: number;
  achievedQuantity: number;
  quantityProgress: number;
  targetActivityCount: number;
  achievedActivityCount: number;
  activityProgress: number;
  progressPercent: number;
  remainingQuantity: number;
  remainingActivityCount: number;
};

export type LearningGoalState =
  "not_started" | "in_progress" | "achieved" | "overdue";

export type NextWork = {
  goalId: string;
  title: string;
  quantity: number;
  unit: LearningProgressUnit;
  activityCount: number;
  reason: "not_started" | "in_progress";
};

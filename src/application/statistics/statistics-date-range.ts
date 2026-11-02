import type { StatisticsRange } from "./statistics-types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 3660;

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new Error("Invalid statistics timeZone");
  }
}

function partsOf(date: Date, formatter: Intl.DateTimeFormat) {
  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function getDateKeyInTimeZone(
  date: Date,
  timeZone: string,
): string {
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid statistics date");
  }

  const parts = partsOf(date, formatterFor(timeZone));

  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function addCalendarDays(
  dateKey: string,
  days: number,
): string {
  if (!isValidDateKey(dateKey) || !Number.isInteger(days)) {
    throw new Error("Invalid statistics calendar date");
  }

  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

/**
 * Convertit minuit d'une date locale en instant UTC.
 * Le calcul utilise Intl et tient compte des changements d'heure.
 */
export function startOfLocalDate(
  dateKey: string,
  timeZone: string,
): Date {
  if (!isValidDateKey(dateKey)) {
    throw new Error("Invalid statistics date");
  }

  const formatter = formatterFor(timeZone);
  const [year, month, day] = dateKey.split("-").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day);

  let guess = targetAsUtc;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const local = partsOf(new Date(guess), formatter);

    const representedAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );

    const difference = targetAsUtc - representedAsUtc;

    if (difference === 0) break;

    guess += difference;
  }

  return new Date(guess);
}

export type StatisticsRangeInput = {
  from?: string | null;
  to?: string | null;
  timeZone?: string | null;
};

export function resolveStatisticsRange(
  input: StatisticsRangeInput = {},
  now = new Date(),
): StatisticsRange {
  const timeZone = input.timeZone?.trim() || "UTC";
  const formatter = formatterFor(timeZone);

  if (!Number.isFinite(now.getTime())) {
    throw new Error("Invalid statistics reference date");
  }

  const today = getDateKeyInTimeZone(now, timeZone);
  const to = input.to || today;
  const from = input.from || addCalendarDays(to, -29);

  if (!isValidDateKey(from) || !isValidDateKey(to)) {
    throw new Error("Invalid statistics date range");
  }

  if (from > to) {
    throw new Error("Statistics start date must be before end date");
  }

  const dayCount =
    (Date.parse(`${to}T00:00:00.000Z`) -
      Date.parse(`${from}T00:00:00.000Z`)) /
    DAY_MS +
    1;

  if (dayCount > MAX_RANGE_DAYS) {
    throw new Error("Statistics date range is too large");
  }

  // Vérifie également le fuseau même si les dates sont déjà fournies.
  void formatter;

  return {
    from,
    to,
    timeZone,
    startAt: startOfLocalDate(from, timeZone),
    endAt: startOfLocalDate(addCalendarDays(to, 1), timeZone),
  };
}

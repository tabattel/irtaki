import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  getDateKeyInTimeZone,
  isValidDateKey,
  resolveStatisticsRange,
  startOfLocalDate,
} from "./statistics-date-range";

describe("statistics date range", () => {
  it("validates calendar date keys", () => {
    expect(isValidDateKey("2026-10-30")).toBe(true);
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("30-10-2026")).toBe(false);
  });

  it("adds calendar days without depending on runtime timezone", () => {
    expect(addCalendarDays("2026-10-30", 1)).toBe("2026-10-31");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("uses the requested timezone to determine the local date", () => {
    const instant = new Date("2026-10-29T23:30:00.000Z");

    expect(getDateKeyInTimeZone(instant, "Africa/Algiers")).toBe(
      "2026-10-30",
    );
    expect(getDateKeyInTimeZone(instant, "UTC")).toBe("2026-10-29");
  });

  it("creates UTC boundaries for local calendar days across DST", () => {
    const start = startOfLocalDate("2026-03-29", "Europe/Paris");
    const next = startOfLocalDate("2026-03-30", "Europe/Paris");

    expect(start.toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(next.toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect(next.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it("defaults to the last 30 local calendar days", () => {
    const range = resolveStatisticsRange(
      { timeZone: "Africa/Algiers" },
      new Date("2026-10-29T23:30:00.000Z"),
    );

    expect(range.from).toBe("2026-10-01");
    expect(range.to).toBe("2026-10-30");
    expect(range.timeZone).toBe("Africa/Algiers");
  });

  it("rejects invalid ranges and timezones", () => {
    expect(() =>
      resolveStatisticsRange({
        from: "2026-10-31",
        to: "2026-10-01",
      }),
    ).toThrow("Statistics start date must be before end date");

    expect(() =>
      resolveStatisticsRange({ timeZone: "Invalid/Timezone" }),
    ).toThrow("Invalid statistics timeZone");
  });
});

export type RecordedPageLines = {
  status: string;
  lineNumbers?: readonly number[];
  pageLineCount?: number | null;
};

export function calculatePageFraction(
  lineNumbersByAyah: Record<string, readonly number[]>,
  pageLineCount: number,
): number | null {
  if (!Number.isInteger(pageLineCount) || pageLineCount < 1) {
    return null;
  }

  const lines = new Set<number>();

  for (const ayahLines of Object.values(lineNumbersByAyah)) {
    for (const line of ayahLines) {
      if (
        Number.isInteger(line) &&
        line > 0 &&
        line <= pageLineCount
      ) {
        lines.add(line);
      }
    }
  }

  if (lines.size === 0) return null;

  return Math.round(
    Math.min(1, lines.size / pageLineCount) * 10000,
  ) / 10000;
}

export function calculateRecordedPagePercentage(
  records: readonly RecordedPageLines[],
): number | null {
  const successful = records.filter(
    (record) =>
      record.status === "completed" ||
      record.status === "partial",
  );

  const pageLineCount = Math.max(
    0,
    ...successful.map((record) =>
      Number.isInteger(record.pageLineCount) &&
      (record.pageLineCount ?? 0) > 0
        ? record.pageLineCount!
        : 0,
    ),
  );

  if (pageLineCount < 1) return null;

  const lines = new Set<number>();

  for (const record of successful) {
    for (const line of record.lineNumbers ?? []) {
      if (
        Number.isInteger(line) &&
        line > 0 &&
        line <= pageLineCount
      ) {
        lines.add(line);
      }
    }
  }

  if (lines.size === 0) return null;

  return Math.min(
    100,
    Math.round((lines.size / pageLineCount) * 100),
  );
}

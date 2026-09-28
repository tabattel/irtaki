import fs from "node:fs/promises";
import path from "node:path";

import type { MushafPageLayout } from "./types";

const LAYOUT_ROOT = path.join(
  process.cwd(),
  "storage",
  "mushaf",
  "layout",
  "kfgqpc-v2-1421h",
);

export async function loadMushafPageLayout(
  pageNumber: number,
): Promise<MushafPageLayout> {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    throw new Error(`Invalid Mushaf page: ${pageNumber}`);
  }

  const filename = `page-${String(pageNumber).padStart(3, "0")}.json`;
  const filePath = path.join(LAYOUT_ROOT, filename);

  const content = await fs.readFile(filePath, "utf-8");
  const layout = JSON.parse(content) as MushafPageLayout;

  return {
    ...layout,
    lines: layout.lines.map((line) => {
      const rawSurahNumber = line.surahNumber as unknown;

      return {
        ...line,
        surahNumber:
          rawSurahNumber === null || rawSurahNumber === ""
            ? null
            : Number(rawSurahNumber),
      };
    }),
  };
}

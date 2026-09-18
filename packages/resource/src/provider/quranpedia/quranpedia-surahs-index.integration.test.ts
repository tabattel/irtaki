import { describe, expect, it } from "vitest";

import { createJsonGzipReader } from "../../reader/json-gzip-reader";
import { createQuranpediaSurahsIndexLoader } from "./quranpedia-surahs-index";

const RAW_SURAHS_INDEX_PATH =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw/surahs-index.json.gz";

describe("QuranpediaSurahsIndexLoader integration", () => {
  it("reads the real surahs-index.json.gz dump", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaSurahsIndexLoader(reader);

    const document = await loader.read(RAW_SURAHS_INDEX_PATH);

    expect(document.schema).toBe("/v1/surahs");
    expect(document.data).toHaveLength(114);

    expect(document.data[0]).toMatchObject({
      id: 1,
      name: "سورة الفاتحة",
      number_of_ayahs: 7,
      first_page: 1,
      last_page: 1,
      first_juz: 1,
      revelation_type: "مكية",
      revelation_order: 5,
    });

    expect(document.data[113]?.id).toBe(114);
  });

  it("preserves the structural fields required by Domain Surah", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaSurahsIndexLoader(reader);

    const document = await loader.read(RAW_SURAHS_INDEX_PATH);

    expect(
      document.data.every(
        (surah) =>
          Number.isInteger(surah.id) &&
          Number.isInteger(surah.number_of_ayahs) &&
          Number.isInteger(surah.first_page) &&
          Number.isInteger(surah.last_page) &&
          Number.isInteger(surah.first_juz) &&
          Number.isInteger(surah.revelation_order),
      ),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { createJsonGzipReader } from "../../reader/json-gzip-reader";
import { createQuranpediaSurahsLoader } from "./quranpedia-surahs";

const RAW_SURAHS_PATH =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw/surahs.json.gz";

describe("QuranpediaSurahsLoader integration", () => {
  it("reads the real surahs.json.gz dump", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaSurahsLoader(reader);

    const document = await loader.read(RAW_SURAHS_PATH);

    expect(document.schema).toBe("/v1/surah/information/{surah}");
    expect(document.data).toHaveLength(114);

    expect(document.data[0]?.surah).toBe(1);
    expect(document.data[113]?.surah).toBe(114);
  });

  it("preserves the information structure", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaSurahsLoader(reader);

    const document = await loader.read(RAW_SURAHS_PATH);
    const information = document.data[0]?.information;

    expect(information).toBeDefined();

    expect(information?.surah_number).toEqual({
      title: "ترتيبها المصحفي",
      value: "1",
    });

    expect(information?.surah_type).toEqual({
      title: "نوعها",
      value: "مكية",
    });

    expect(information?.ayahs_count).toHaveLength(5);

    expect(information?.ayahs_count[0]).toEqual({
      title: "العد المدني الأول",
      value: 7,
    });
  });

  it("preserves nullable editorial fields", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaSurahsLoader(reader);

    const document = await loader.read(RAW_SURAHS_PATH);

    const nullableFields = document.data.flatMap((entry) => [
      entry.information.grace.value,
      entry.information.prophet.value,
      entry.information.revelation.value,
      entry.information.purposes.value,
    ]);

    expect(nullableFields.some((value) => value === null)).toBe(true);
  });

  it("preserves all five ayah-count systems for every surah", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaSurahsLoader(reader);

    const document = await loader.read(RAW_SURAHS_PATH);

    expect(
      document.data.every(
        (entry) => entry.information.ayahs_count.length === 5,
      ),
    ).toBe(true);
  });
});

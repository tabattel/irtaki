import { describe, expect, it } from "vitest";

import {
  mapQuranpediaSurahToDomain,
} from "./quranpedia-surah-domain-mapper";

import type { QuranpediaSurahIndexRecord } from "../provider/quranpedia/quranpedia-surahs-index";

function createSurah(
  overrides: Partial<QuranpediaSurahIndexRecord> = {},
): QuranpediaSurahIndexRecord {
  return {
    id: 1,
    name: "سورة الفاتحة",
    coded_name: "ﮍ",
    translated_name: "الفاتحة\r\n",
    number_of_ayahs: 7,
    first_page: 1,
    last_page: 1,
    first_juz: 1,
    revelation_type: "مكية",
    revelation_order: 5,
    ...overrides,
  };
}

describe("quranpedia surah domain mapper", () => {
  it("maps a Quranpedia Meccan surah to Domain Core", () => {
    const surah = mapQuranpediaSurahToDomain(createSurah());

    expect(surah.id).toBe(1);
    expect(surah.number).toBe(1);
    expect(surah.name).toBe("سورة الفاتحة");
    expect(surah.codedName).toBe("ﮍ");
    expect(surah.translatedName).toBe("الفاتحة");
    expect(surah.numberOfAyahs).toBe(7);
    expect(surah.firstPage).toBe(1);
    expect(surah.lastPage).toBe(1);
    expect(surah.firstJuz).toBe(1);
    expect(surah.revelationType).toBe("meccan");
    expect(surah.revelationOrder).toBe(5);
  });

  it("maps a Quranpedia Medinan surah", () => {
    const surah = mapQuranpediaSurahToDomain(
      createSurah({
        id: 2,
        name: "سورةالبقرة",
        translated_name: "البقرة\r\n",
        number_of_ayahs: 286,
        first_page: 2,
        last_page: 49,
        first_juz: 1,
        revelation_type: "مدنية",
        revelation_order: 87,
      }),
    );

    expect(surah.revelationType).toBe("medinan");
  });

  it("rejects an unknown Quranpedia revelation type", () => {
    expect(() =>
      mapQuranpediaSurahToDomain(
        createSurah({
          revelation_type: "غير معروف",
        }),
      ),
    ).toThrow("Quranpedia revelation type not supported");
  });
});

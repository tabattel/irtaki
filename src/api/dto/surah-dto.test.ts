import { describe, expect, it } from "vitest";
import { toSurahDto } from "./surah-dto";

describe("surah dto", () => {
  it("maps a surah to the API DTO", () => {
    const result = toSurahDto({
      id: 1,
      number: 1,
      name: "الفاتحة",
      codedName: "al-fatihah",
      translatedName: "The Opening",
      numberOfAyahs: 7,
      firstPage: 1,
      lastPage: 1,
      firstJuz: 1,
      revelationType: "meccan",
      revelationOrder: 5,
    });

    expect(result).toEqual({
      id: 1,
      number: 1,
      name: "الفاتحة",
      codedName: "al-fatihah",
      translatedName: "The Opening",
      numberOfAyahs: 7,
      firstPage: 1,
      lastPage: 1,
      firstJuz: 1,
      revelationType: "meccan",
      revelationOrder: 5,
    });
  });
});

import { describe, expect, it } from "vitest";
import { toAyahDto } from "./ayah-dto";

describe("ayah dto", () => {
  it("maps an ayah including numberInHafs", () => {
    const result = toAyahDto({
      id: 1,
      number: 1,
      surahNumber: 1,
      text: "بِسْمِ اللَّهِ",
      pageNumber: 1,
      juz: 1,
      hizb: 1,
      manzil: 1,
      ruku: 1,
      marker: "1",
      numberInHafs: [1, 1],
    });

    expect(result).toEqual({
      id: 1,
      number: 1,
      surahNumber: 1,
      text: "بِسْمِ اللَّهِ",
      pageNumber: 1,
      juz: 1,
      hizb: 1,
      manzil: 1,
      ruku: 1,
      marker: "1",
      numberInHafs: [1, 1],
    });
  });
});

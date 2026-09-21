import { describe, expect, it } from "vitest";

import { SearchUseCase } from "./search-use-case";

describe("SearchUseCase", () => {
  it("searches ayah text and surah names", async () => {
    const ayahRepository = {
      findAllForSearch: async () => [
        {
          id: 1,
          number: 1,
          surahNumber: 1,
          text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
        },
        {
          id: 2,
          number: 2,
          surahNumber: 1,
          text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
        },
      ],
    };

    const surahRepository = {
      findAll: async () => [
        {
          id: 1,
          number: 1,
          name: "الفاتحة",
        },
      ],
    };

    const useCase = new SearchUseCase(ayahRepository, surahRepository);

    const response = await useCase.execute({
      query: "الفاتحة",
      mode: "partial",
    });

    expect(response.rootSearchAvailable).toBe(false);
    expect(response.total).toBe(1);
    expect(response.results[0]).toMatchObject({
      source: "surah",
      surahNumber: 1,
      surahName: "الفاتحة",
    });
  });

  it("returns empty results for an empty query", async () => {
    const ayahRepository = {
      findAllForSearch: async () => [],
    };

    const surahRepository = {
      findAll: async () => [],
    };

    const useCase = new SearchUseCase(ayahRepository, surahRepository);

    const response = await useCase.execute({
      query: "   ",
      mode: "exact",
    });

    expect(response.results).toEqual([]);
    expect(response.total).toBe(0);
  });
});

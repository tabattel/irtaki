import { describe, expect, it } from "vitest";
import { searchDocuments } from "./search-engine";

const documents = [
  {
    id: 1,
    source: "ayah" as const,
    surahNumber: 1,
    surahName: "الفاتحة",
    ayahNumber: 1,
    text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  },
  {
    id: 2,
    source: "ayah" as const,
    surahNumber: 1,
    surahName: "الفاتحة",
    ayahNumber: 2,
    text: "الْحَمْدُ اللهُ رَبِّ الْعَالَمِينَ",
  },
  {
    id: 3,
    source: "ayah" as const,
    surahNumber: 1,
    surahName: "الفاتحة",
    ayahNumber: 3,
    text: "الرَّحْمَٰنِ الرَّحِيمِ",
  },
  {
    id: 4,
    source: "ayah" as const,
    surahNumber: 2,
    surahName: "البقرة",
    ayahNumber: 1,
    text: "الم",
  },
  {
    id: 5,
    source: "surah" as const,
    surahNumber: 1,
    surahName: "الفاتحة",
    text: "الفاتحة",
  },
  {
    id: 6,
    source: "surah" as const,
    surahNumber: 2,
    surahName: "البقرة",
    text: "البقرة",
  },
];

describe("search engine", () => {
  it("searches Quran ayah text", () => {
    const result = searchDocuments(documents, {
      query: "الله",
      mode: "exact",
    });

    expect(result.total).toBe(2);
    expect(result.results.map((item) => item.ayahNumber)).toEqual([1, 2]);
  });

  it("searches the full Arabic surah name", () => {
    const result = searchDocuments(documents, {
      query: "الفاتحة",
      mode: "exact",
    });

    expect(result.results.some((item) => item.source === "surah")).toBe(true);
  });

  it("numbers results from one", () => {
    const result = searchDocuments(documents, {
      query: "الله",
      mode: "exact",
    });

    expect(result.results.map((item) => item.resultNumber)).toEqual([1, 2]);
  });

  it("keeps multiple occurrences in the same ayah", () => {
    const source = [
      {
        id: 10,
        source: "ayah" as const,
        surahNumber: 1,
        surahName: "الفاتحة",
        ayahNumber: 1,
        text: "الله ثم الله",
      },
    ];

    const result = searchDocuments(source, {
      query: "الله",
      mode: "exact",
    });

    expect(result.total).toBe(2);
    expect(result.results[0]?.occurrence.start).toBe(0);
    expect(result.results[1]?.occurrence.start).toBe(8);
  });

  it("keeps root search unavailable in v1", () => {
    const result = searchDocuments(documents, {
      query: "كتب",
      mode: "partial",
    });

    expect(result.rootSearchAvailable).toBe(false);
  });

  it("returns no result for an empty query", () => {
    const result = searchDocuments(documents, {
      query: "   ",
      mode: "exact",
    });

    expect(result.total).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});

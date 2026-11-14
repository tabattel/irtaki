import { describe, expect, it } from "vitest";
import {
  extractTarteelArabicWords,
  findTarteelWordMatches,
  findTarteelSequenceCandidates,
  findTarteelLongestSuffixCandidates,
  getTarteelNewWords,
  normalizeTarteelArabic,
} from "./mushaf-tarteel-matching";

describe("Tarteel Arabic matching", () => {
  it("normalizes Arabic diacritics and alef variants", () => {
    expect(normalizeTarteelArabic("إِنَّا أَعْطَيْنَاكَ")).toBe(
      "انا اعطيناك",
    );
  });

  it("extracts Arabic words from a transcription", () => {
    expect(extractTarteelArabicWords("بِسْمِ اللَّهِ الرَّحْمَٰنِ")).toEqual([
      "بسم",
      "الله",
      "الرحمن",
    ]);
  });

  it("matches words in their correct order", () => {
    const targets = [
      { key: "1:1:1", text: "بِسْمِ" },
      { key: "1:1:2", text: "اللَّهِ" },
      { key: "1:1:3", text: "الرَّحْمَٰنِ" },
    ];

    expect(findTarteelWordMatches(targets, "بسم الله الرحمن")).toEqual([
      { key: "1:1:1", targetIndex: 0, recognizedIndex: 0 },
      { key: "1:1:2", targetIndex: 1, recognizedIndex: 1 },
      { key: "1:1:3", targetIndex: 2, recognizedIndex: 2 },
    ]);
  });

  it("does not match a word against a different target word", () => {
    const targets = [
      { key: "1:1:1", text: "بسم" },
      { key: "1:1:2", text: "الله" },
    ];

    expect(findTarteelWordMatches(targets, "بسم الرحمن")).toEqual([
      { key: "1:1:1", targetIndex: 0, recognizedIndex: 0 },
    ]);
  });

  it("preserves the order and skips already processed target words", () => {
    const targets = [
      { key: "1:1:1", text: "بسم" },
      { key: "1:1:2", text: "الله" },
      { key: "1:1:3", text: "الرحمن" },
    ];

    expect(findTarteelWordMatches(targets, "الله الرحمن", 1)).toEqual([
      { key: "1:1:2", targetIndex: 1, recognizedIndex: 0 },
      { key: "1:1:3", targetIndex: 2, recognizedIndex: 1 },
    ]);
  });

  it("returns no matches for an invalid starting index", () => {
    const targets = [{ key: "1:1:1", text: "بسم" }];

    expect(findTarteelWordMatches(targets, "بسم", -1)).toEqual([]);
    expect(findTarteelWordMatches(targets, "بسم", 1)).toEqual([]);
  });
});

describe("Tarteel successive transcription", () => {
  it("extracts only newly appended words from cumulative text", () => {
    expect(getTarteelNewWords("بسم الله", "بسم الله الرحمن")).toEqual([
      "الرحمن",
    ]);
  });

  it("detects new words in an overlapping sliding window", () => {
    expect(
      getTarteelNewWords(
        "بسم الله الرحمن",
        "الله الرحمن الرحيم",
      ),
    ).toEqual(["الرحيم"]);
  });

  it("returns no words when the transcription is unchanged", () => {
    expect(getTarteelNewWords("بسم الله", "بسم الله")).toEqual([]);
  });

  it("rejects an ambiguous correction without reliable overlap", () => {
    expect(
      getTarteelNewWords("بسم الله الرحمن", "الحمد لله رب"),
    ).toEqual([]);
  });

  it("returns all words for the first transcription", () => {
    expect(getTarteelNewWords("", "بسم الله")).toEqual([
      "بسم",
      "الله",
    ]);
  });
});



describe("Tarteel global sequence search", () => {
  it("finds a unique contiguous sequence", () => {
    const targets = [
      { key: "1:1:1", text: "بسم" },
      { key: "1:1:2", text: "الله" },
      { key: "1:1:3", text: "الرحمن" },
      { key: "1:1:4", text: "الرحيم" },
    ];

    expect(
      findTarteelSequenceCandidates(targets, "الله الرحمن"),
    ).toEqual([
      {
        startIndex: 1,
        endIndex: 2,
        matches: [
          { key: "1:1:2", targetIndex: 1, recognizedIndex: 0 },
          { key: "1:1:3", targetIndex: 2, recognizedIndex: 1 },
        ],
      },
    ]);
  });

  it("returns every occurrence of an ambiguous sequence", () => {
    const targets = [
      { key: "1:1:1", text: "الحمد" },
      { key: "1:1:2", text: "لله" },
      { key: "1:1:3", text: "رب" },
      { key: "2:1:1", text: "الحمد" },
      { key: "2:1:2", text: "لله" },
      { key: "2:1:3", text: "رب" },
    ];

    const candidates = findTarteelSequenceCandidates(
      targets,
      "الحمد لله رب",
    );

    expect(candidates.map(({ startIndex, endIndex }) => ({
      startIndex,
      endIndex,
    }))).toEqual([
      { startIndex: 0, endIndex: 2 },
      { startIndex: 3, endIndex: 5 },
    ]);
  });

  it("rejects words in the wrong order", () => {
    const targets = [
      { key: "1:1:1", text: "بسم" },
      { key: "1:1:2", text: "الله" },
      { key: "1:1:3", text: "الرحمن" },
    ];

    expect(
      findTarteelSequenceCandidates(targets, "الله بسم"),
    ).toEqual([]);
  });

  it("rejects a sequence when target words are separated", () => {
    const targets = [
      { key: "1:1:1", text: "بسم" },
      { key: "1:1:2", text: "نور" },
      { key: "1:1:3", text: "الله" },
    ];

    expect(
      findTarteelSequenceCandidates(targets, "بسم الله"),
    ).toEqual([]);
  });
});

describe("Tarteel longest suffix search", () => {
  it("prefers the longest matching suffix", () => {
    const targets = [
      { key: "1:1:1", text: "بسم" },
      { key: "1:1:2", text: "الله" },
      { key: "1:1:3", text: "الرحمن" },
      { key: "1:1:4", text: "الرحيم" },
      { key: "2:1:1", text: "الرحيم" },
    ];

    const result = findTarteelLongestSuffixCandidates(
      targets,
      "كلمة غيرموجودة الله الرحمن الرحيم",
    );

    expect(result.matchedWords).toBe(3);
    expect(result.recognizedWords).toEqual([
      "الله",
      "الرحمن",
      "الرحيم",
    ]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].startIndex).toBe(1);
  });

  it("preserves every occurrence of an ambiguous longest suffix", () => {
    const targets = [
      { key: "1:1:1", text: "الحمد" },
      { key: "1:1:2", text: "لله" },
      { key: "2:1:1", text: "الحمد" },
      { key: "2:1:2", text: "لله" },
    ];

    const result = findTarteelLongestSuffixCandidates(
      targets,
      "كلمة الحمد لله",
    );

    expect(result.matchedWords).toBe(2);
    expect(result.candidates.map((candidate) => candidate.startIndex))
      .toEqual([0, 2]);
  });

  it("falls back to a shorter suffix when earlier words do not match", () => {
    const targets = [
      { key: "1:1:1", text: "الرحمن" },
      { key: "1:1:2", text: "الرحيم" },
    ];

    const result = findTarteelLongestSuffixCandidates(
      targets,
      "بسم الله الرحمن الرحيم",
    );

    expect(result.matchedWords).toBe(2);
    expect(result.recognizedWords).toEqual(["الرحمن", "الرحيم"]);
    expect(result.candidates).toHaveLength(1);
  });

  it("returns an empty result when no suffix matches", () => {
    const targets = [
      { key: "1:1:1", text: "بسم" },
      { key: "1:1:2", text: "الله" },
    ];

    expect(
      findTarteelLongestSuffixCandidates(targets, "الرحمن الرحيم"),
    ).toEqual({
      recognizedWords: [],
      matchedWords: 0,
      candidates: [],
    });
  });
});


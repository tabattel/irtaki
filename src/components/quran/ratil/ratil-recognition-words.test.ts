import { describe, expect, it } from "vitest";

import {
  mergeRatilRecognitionWords,
  normalizeRatilWordToken,
} from "./ratil-recognition-words";

import type { RatilRecognitionWord } from "./ratil-recognition-client";

function word(
  text: string,
  start: number,
  end: number,
  probability: number | null,
  sequence: number,
): RatilRecognitionWord {
  return {
    text,
    word: text,
    start,
    end,
    probability,
    sequence,
    segmentIndex: 0,
  };
}

describe("Ratil recognition word normalization", () => {
  it("normalizes Arabic diacritics and letter variants", () => {
    expect(normalizeRatilWordToken("الْحَمْدُ")).toBe("الحمد");
    expect(normalizeRatilWordToken("إِنَّا")).toBe("انا");
    expect(normalizeRatilWordToken("عَلَىٰ")).toBe("علا");
  });
});

describe("Ratil temporal word deduplication", () => {
  it("merges the same word recognized in overlapping audio windows", () => {
    const result = mergeRatilRecognitionWords(
      [word("الْحَمْدُ", 1.0, 1.4, 0.8, 0)],
      [word("الحمد", 1.05, 1.45, 0.9, 1)],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.probability).toBe(0.9);
    expect(result[0]?.sequence).toBe(1);
  });

  it("preserves genuine repetitions at different times", () => {
    const result = mergeRatilRecognitionWords(
      [],
      [word("الله", 1.0, 1.3, 0.9, 0), word("الله", 1.4, 1.7, 0.92, 1)],
    );

    expect(result).toHaveLength(2);
  });

  it("does not merge different Arabic words at the same time", () => {
    const result = mergeRatilRecognitionWords(
      [],
      [word("الحمد", 1.0, 1.4, 0.9, 0), word("الله", 1.0, 1.4, 0.95, 1)],
    );

    expect(result).toHaveLength(2);
  });

  it("retains the word with the highest probability", () => {
    const result = mergeRatilRecognitionWords(
      [word("رب", 2.0, 2.4, 0.7, 0)],
      [word("رب", 2.05, 2.45, 0.95, 1)],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.probability).toBe(0.95);
  });

  it("keeps words sorted by their audio timestamps", () => {
    const result = mergeRatilRecognitionWords(
      [],
      [
        word("العالمين", 3.0, 3.5, 0.9, 0),
        word("الحمد", 1.0, 1.4, 0.9, 0),
        word("رب", 2.0, 2.4, 0.9, 0),
      ],
    );

    expect(result.map((item) => item.text)).toEqual([
      "الحمد",
      "رب",
      "العالمين",
    ]);
  });

  it("removes words older than the configured time window", () => {
    const result = mergeRatilRecognitionWords(
      [word("قديم", 1.0, 1.3, 0.9, 0)],
      [word("حديث", 9.0, 9.4, 0.9, 1)],
      { maxAgeSeconds: 8 },
    );

    expect(result.map((item) => item.text)).toEqual(["حديث"]);
  });

  it("expires old words when an empty audio window advances time", () => {
    const result = mergeRatilRecognitionWords(
      [word("قديم", 1.0, 1.3, 0.9, 0)],
      [],
      {
        maxAgeSeconds: 8,
        referenceTimeSeconds: 10,
      },
    );

    expect(result).toEqual([]);
  });

  it("keeps recent words when an empty audio window advances time", () => {
    const result = mergeRatilRecognitionWords(
      [word("حديث", 4.0, 4.4, 0.9, 0)],
      [],
      {
        maxAgeSeconds: 8,
        referenceTimeSeconds: 10,
      },
    );

    expect(result.map((item) => item.text)).toEqual(["حديث"]);
  });

  it("respects the maximum retained word count", () => {
    const result = mergeRatilRecognitionWords(
      [],
      [
        word("واحد", 1.0, 1.2, 0.9, 0),
        word("اثنان", 2.0, 2.2, 0.9, 1),
        word("ثلاثة", 3.0, 3.2, 0.9, 2),
        word("أربعة", 4.0, 4.2, 0.9, 3),
      ],
      { maxWords: 3 },
    );

    expect(result.map((item) => item.text)).toEqual([
      "اثنان",
      "ثلاثة",
      "أربعة",
    ]);
  });

  it("does not invent a duplicate when intervals do not overlap", () => {
    const result = mergeRatilRecognitionWords(
      [word("الله", 1.0, 1.2, 0.9, 0)],
      [word("الله", 1.21, 1.4, 0.9, 1)],
    );

    expect(result).toHaveLength(2);
  });
});

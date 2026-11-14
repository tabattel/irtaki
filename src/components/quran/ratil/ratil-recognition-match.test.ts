import { describe, expect, it } from "vitest";

import {
  countRatilArabicWords,
  isRatilAyahConfirmed,
  isRatilCompleteShortAyah,
  selectUniqueRatilCandidate,
  normalizeRatilArabicWords,
} from "./ratil-recognition-match";

const longAyah = {
  ayahId: 1,
  text: "بسم الله الرحمن الرحيم رب العالمين",
};

describe("Ratil candidate selection", () => {
  it("accepts one unique ayah", () => {
    const result = selectUniqueRatilCandidate([longAyah]);

    expect(result.candidate?.ayahId).toBe(1);
    expect(result.ambiguous).toBe(false);
  });

  it("rejects multiple different ayat", () => {
    const result = selectUniqueRatilCandidate([
      longAyah,
      { ayahId: 2, text: "الحمد لله رب العالمين" },
    ]);

    expect(result.candidate).toBeNull();
    expect(result.ambiguous).toBe(true);
  });

  it("deduplicates repeated results for the same ayah", () => {
    const result = selectUniqueRatilCandidate([
      longAyah,
      { ...longAyah },
    ]);

    expect(result.candidate?.ayahId).toBe(1);
    expect(result.ambiguous).toBe(false);
  });

  it("returns no candidate for an empty result", () => {
    const result = selectUniqueRatilCandidate([]);

    expect(result.candidate).toBeNull();
    expect(result.ambiguous).toBe(false);
  });
});

describe("Ratil ayah confirmation", () => {
  it("keeps three words provisional in a long ayah", () => {
    expect(isRatilAyahConfirmed(longAyah, 3, false)).toBe(false);
  });

  it("confirms four words in a unique ayah", () => {
    expect(isRatilAyahConfirmed(longAyah, 4, false)).toBe(true);
  });

  it("confirms a complete short ayah", () => {
    const shortAyah = {
      ayahId: 3,
      text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    };

    expect(countRatilArabicWords(shortAyah.text)).toBe(4);
    expect(isRatilAyahConfirmed(shortAyah, 4, false)).toBe(true);
  });

  it("never confirms an ambiguous candidate", () => {
    expect(isRatilAyahConfirmed(longAyah, 5, true)).toBe(false);
  });

  it("rejects an invalid word count", () => {
    expect(isRatilAyahConfirmed(longAyah, 0, false)).toBe(false);
    expect(isRatilAyahConfirmed(longAyah, 2.5, false)).toBe(false);
  });

  it("rejects a candidate without Arabic words", () => {
    expect(
      isRatilAyahConfirmed(
        { ayahId: 4, text: "123 !!!" },
        4,
        false,
      ),
    ).toBe(false);
  });

  it("recognizes a complete two-word ayah after Arabic normalization", () => {
    const candidate = {
      ayahId: 10,
      text: "قُلْ هُوَ",
    };

    expect(
      isRatilCompleteShortAyah(candidate, ["قل", "هُوَ"], false),
    ).toBe(true);
  });

  it("rejects two words that are only part of a longer ayah", () => {
    const candidate = {
      ayahId: 11,
      text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    };

    expect(
      isRatilCompleteShortAyah(candidate, ["قل", "هو"], false),
    ).toBe(false);
  });

  it("keeps ambiguous short ayat unconfirmed", () => {
    const candidate = {
      ayahId: 12,
      text: "قُلْ هُوَ",
    };

    expect(
      isRatilCompleteShortAyah(candidate, ["قل", "هو"], true),
    ).toBe(false);
  });

  it("recognizes a one-word ayah without automatically confirming it", () => {
    const candidate = {
      ayahId: 13,
      text: "صٓ",
    };

    expect(
      isRatilCompleteShortAyah(candidate, ["ص"], false),
    ).toBe(true);

    expect(
      isRatilAyahConfirmed(candidate, 1, false),
    ).toBe(false);
  });

  it("does not accept a two-word candidate with one recognized word", () => {
    const candidate = {
      ayahId: 14,
      text: "قُلْ هُوَ",
    };

    expect(
      isRatilCompleteShortAyah(candidate, ["قل"], false),
    ).toBe(false);
  });

});

describe("Ratil Arabic word normalization", () => {
  it("normalizes every Arabic word in a phrase", () => {
    expect(
      normalizeRatilArabicWords("الْحَمْدُ إِنَّا"),
    ).toEqual(["الحمد", "انا"]);
  });
});

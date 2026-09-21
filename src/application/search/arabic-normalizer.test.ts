import { describe, expect, it } from "vitest";
import {
  normalizeArabicForSearch,
  normalizeArabicForSearchWithMapping,
  normalizeArabicLetters,
  removeArabicDiacritics,
} from "./arabic-normalizer";

describe("Arabic normalizer", () => {
  it("removes Arabic diacritics", () => {
    expect(removeArabicDiacritics("الْحَمْدُ لِلَّهِ")).toBe("الحمد لله");
  });

  it("preserves spaces", () => {
    expect(removeArabicDiacritics("عبد  الله")).toBe("عبد  الله");
  });

  it("normalizes alef variants", () => {
    expect(normalizeArabicLetters("أ إ آ ا ى")).toBe("ا ا ا ا ا");
  });

  it("normalizes hamza variants", () => {
    expect(normalizeArabicLetters("ء ئ")).toBe("ء ء");
  });

  it("normalizes waw variants", () => {
    expect(normalizeArabicLetters("و ؤ")).toBe("و و");
  });

  it("does not normalize ي to ى", () => {
    expect(normalizeArabicLetters("ي ى")).toBe("ي ا");
  });

  it("combines diacritic removal and letter normalization", () => {
    expect(normalizeArabicForSearch("إِنَّا أَعْطَيْنَاكَ")).toBe(
      "انا اعطيناك",
    );
  });

  it("does not modify the original text", () => {
    const original = "إِنَّا أَعْطَيْنَاكَ";
    normalizeArabicForSearch(original);
    expect(original).toBe("إِنَّا أَعْطَيْنَاكَ");
  });

  it("keeps normalized offsets mapped to the original text", () => {
    const result = normalizeArabicForSearchWithMapping("إِنَّا أَعْطَيْنَاكَ");

    expect(result.text).toBe("انا اعطيناك");
    expect(result.originalStart[0]).toBe(0);
    expect(result.originalStart[1]).toBe(2);
    expect(result.originalEnd[1]).toBe(3);
  });
});

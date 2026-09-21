import { describe, expect, it } from "vitest";
import { matchSearchText } from "./search-matcher";

describe("search matcher", () => {
  it("finds an exact Arabic word", () => {
    const result = matchSearchText(
      "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ الله",
      "الله",
      "exact",
    );

    expect(result.matches).toHaveLength(1);
  });

  it("does not treat part of a word as an exact match", () => {
    const result = matchSearchText("يكتب الكتاب مكتوب", "كتب", "exact");

    expect(result.matches).toHaveLength(0);
  });

  it("finds an exact word multiple times", () => {
    const result = matchSearchText("الله رب الله رب الله", "الله", "exact");

    expect(result.matches).toHaveLength(3);
  });

  it("finds partial matches from three Arabic letters", () => {
    const result = matchSearchText("كتب مكتبة يكتب كتابة", "كتب", "partial");

    expect(result.matches).toHaveLength(3);
  });

  it("rejects partial searches shorter than three Arabic letters", () => {
    const result = matchSearchText("كتب كتاب", "كت", "partial");

    expect(result.matches).toHaveLength(0);
  });

  it("keeps spaces significant", () => {
    const result = matchSearchText("عبد الله عبدالعزيز", "عبد الله", "exact");

    expect(result.matches).toHaveLength(1);
  });

  it("returns no result when there is no match", () => {
    const result = matchSearchText("الحمد لله", "الكتاب", "exact");

    expect(result.matches).toHaveLength(0);
  });

  it("normalizes Arabic letter variants before matching", () => {
    const result = matchSearchText("إِنَّا أَعْطَيْنَاكَ", "انا", "exact");

    expect(result.matches).toHaveLength(1);
  });

  it("returns original occurrence positions", () => {
    const result = matchSearchText("إِنَّا الله", "انا", "exact");

    expect(result.matches[0]?.occurrence).toEqual({
      start: 0,
      end: 6,
    });
  });

  it("finds two occurrences in the same ayah", () => {
    const result = matchSearchText("الله ثم الله", "الله", "exact");

    expect(result.matches).toHaveLength(2);
    expect(result.matches[0]?.occurrence.start).toBe(0);
    expect(result.matches[1]?.occurrence.start).toBe(8);
  });
});

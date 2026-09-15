import { describe, expect, it } from "vitest";
import { Ayah } from "./ayah";

describe("Ayah", () => {
  const validProps = {
    id: 1,
    number: 1,
    surahNumber: 1,
    text: " الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ",
    pageNumber: 1,
    juz: 1,
    hizb: 1,
    manzil: 1,
    ruku: 1,
    marker: "ﰀ",
    numberInHafs: [1],
  };

  it("creates a valid ayah", () => {
    const ayah = new Ayah(validProps);

    expect(ayah.id).toBe(1);
    expect(ayah.number).toBe(1);
    expect(ayah.surahNumber).toBe(1);
    expect(ayah.text).toBe("الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ");
    expect(ayah.pageNumber).toBe(1);
    expect(ayah.juz).toBe(1);
    expect(ayah.hizb).toBe(1);
    expect(ayah.manzil).toBe(1);
    expect(ayah.ruku).toBe(1);
    expect(ayah.marker).toBe("ﰀ");
    expect(ayah.numberInHafs).toEqual([1]);
  });

  it("trims text and marker", () => {
    const ayah = new Ayah(validProps);

    expect(ayah.text).not.toMatch(/^\s|\s$/);
    expect(ayah.marker).not.toMatch(/^\s|\s$/);
  });

  it("rejects an invalid ayah ID", () => {
    expect(() => new Ayah({ ...validProps, id: 0 })).toThrow();
  });

  it("rejects an invalid ayah number", () => {
    expect(() => new Ayah({ ...validProps, number: 0 })).toThrow();
  });

  it("rejects an invalid surah number", () => {
    expect(() => new Ayah({ ...validProps, surahNumber: 0 })).toThrow();

    expect(() => new Ayah({ ...validProps, surahNumber: 115 })).toThrow();
  });

  it("rejects empty text", () => {
    expect(() => new Ayah({ ...validProps, text: "   " })).toThrow();
  });

  it("rejects an invalid numberInHafs", () => {
    expect(() => new Ayah({ ...validProps, numberInHafs: [] })).toThrow();

    expect(() => new Ayah({ ...validProps, numberInHafs: [0] })).toThrow();
  });
});

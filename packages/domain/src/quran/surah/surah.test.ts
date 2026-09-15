import { describe, expect, it } from "vitest";
import { Surah } from "./surah";

describe("Surah", () => {
  const validProps = {
    id: 1,
    number: 1,
    name: "سورة الفاتحة",
    codedName: "ﮍ",
    translatedName: "الفاتحة",
    numberOfAyahs: 7,
    firstPage: 1,
    lastPage: 1,
    firstJuz: 1,
    revelationType: "meccan" as const,
    revelationOrder: 5,
  };

  it("creates a valid surah", () => {
    const surah = new Surah(validProps);

    expect(surah.id).toBe(1);
    expect(surah.number).toBe(1);
    expect(surah.name).toBe("سورة الفاتحة");
    expect(surah.codedName).toBe("ﮍ");
    expect(surah.translatedName).toBe("الفاتحة");
    expect(surah.numberOfAyahs).toBe(7);
    expect(surah.firstPage).toBe(1);
    expect(surah.lastPage).toBe(1);
    expect(surah.firstJuz).toBe(1);
    expect(surah.revelationType).toBe("meccan");
    expect(surah.revelationOrder).toBe(5);
  });

  it("rejects a surah number outside 1 to 114", () => {
    expect(() => new Surah({ ...validProps, number: 0 })).toThrow();
    expect(() => new Surah({ ...validProps, number: 115 })).toThrow();
  });

  it("rejects an empty name", () => {
    expect(() => new Surah({ ...validProps, name: "   " })).toThrow();
  });

  it("rejects an invalid ayah count", () => {
    expect(() => new Surah({ ...validProps, numberOfAyahs: 0 })).toThrow();
  });

  it("rejects an invalid page range", () => {
    expect(
      () =>
        new Surah({
          ...validProps,
          firstPage: 10,
          lastPage: 9,
        }),
    ).toThrow();
  });

  it("accepts a medinan surah", () => {
    const surah = new Surah({
      ...validProps,
      number: 2,
      name: "سورة البقرة",
      numberOfAyahs: 286,
      firstPage: 2,
      lastPage: 49,
      revelationType: "medinan",
      revelationOrder: 87,
    });

    expect(surah.revelationType).toBe("medinan");
  });
});

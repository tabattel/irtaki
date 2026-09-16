import { describe, expect, it } from "vitest";

import {
  mapQuranpediaMushafToDomain,
  type QuranpediaMushafRecord,
} from "./quranpedia-domain-mapper";

describe("Quranpedia to Domain mapping", () => {
  it("maps a complete Quranpedia mushaf record to a Domain Core Mushaf", () => {
    const record: QuranpediaMushafRecord = {
      id: 1,
      name: "مصحف حفص",
      description: "القرآن الكريم برواية حفص عن عاصم",
      bismillah: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ",
      riwayaId: 10,
    };

    const mushaf = mapQuranpediaMushafToDomain(record);

    expect(mushaf.id).toBe(1);
    expect(mushaf.name).toBe("مصحف حفص");
    expect(mushaf.description).toBe(
      "القرآن الكريم برواية حفص عن عاصم",
    );
    expect(mushaf.bismillah).toBe(
      "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ",
    );
    expect(mushaf.riwayaId).toBe(10);
  });

  it("maps a Quranpedia mushaf record with optional fields omitted", () => {
    const record: QuranpediaMushafRecord = {
      id: 1,
      name: "مصحف حفص",
      riwayaId: 10,
    };

    const mushaf = mapQuranpediaMushafToDomain(record);

    expect(mushaf.id).toBe(1);
    expect(mushaf.name).toBe("مصحف حفص");
    expect(mushaf.description).toBeUndefined();
    expect(mushaf.bismillah).toBeUndefined();
    expect(mushaf.riwayaId).toBe(10);
  });

  it("uses Domain Core validation", () => {
    expect(() =>
      mapQuranpediaMushafToDomain({
        id: 0,
        name: "Mushaf invalide",
        riwayaId: 10,
      }),
    ).toThrow();

    expect(() =>
      mapQuranpediaMushafToDomain({
        id: 1,
        name: "   ",
        riwayaId: 10,
      }),
    ).toThrow();

    expect(() =>
      mapQuranpediaMushafToDomain({
        id: 1,
        name: "Mushaf invalide",
        riwayaId: 0,
      }),
    ).toThrow();
  });
});

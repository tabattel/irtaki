import { describe, expect, it } from "vitest";

import {
  mapQuranpediaMushafToDomain,
  resolveQuranpediaQiraaId,
  resolveQuranpediaRiwayaId,
} from "./quranpedia-domain-mapper";

import type { QuranpediaMushafRaw } from "../provider/quranpedia/quranpedia-mushaf";

function createMushaf(
  overrides: Partial<QuranpediaMushafRaw> = {},
): QuranpediaMushafRaw {
  return {
    id: 2,
    name: "حفص عن عاصم",
    description: "Mushaf Hafs",
    bismillah: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    rawi: {
      id: 10,
      name: "حفص",
      full_name: "حفص عن عاصم",
      qiraa: {
        id: 5,
        name: "عاصم",
        count: {
          id: 1,
          name: "حفص",
        },
      },
    },
    surahs: [],
    ...overrides,
  };
}

describe("quranpedia domain mapper", () => {
  it("resolves qiraa from Quranpedia qiraa id and qiraa name", () => {
    const mushaf = createMushaf();

    expect(resolveQuranpediaQiraaId(mushaf)).toBe(5);
  });

  it("maps the selected Hafs mushaf to Domain Core", () => {
    const mushaf = mapQuranpediaMushafToDomain(createMushaf());

    expect(mushaf.id).toBe(2);
    expect(mushaf.name).toBe("حفص عن عاصم");
    expect(mushaf.riwayaId).toBe(10);
  });

  it("resolves Qalun to Domain Riwaya 1", () => {
    const mushaf = createMushaf({
      id: 7,
      name: "قالون عن نافع",
      rawi: {
        id: 1,
        name: "قالون",
        full_name: "قالون عن نافع",
        qiraa: {
          id: 1,
          name: "نافع",
          count: {
            id: 1,
            name: "قالون",
          },
        },
      },
    });

    expect(resolveQuranpediaRiwayaId(mushaf)).toBe(1);
  });

  it("resolves Warsh to Domain Riwaya 2", () => {
    const mushaf = createMushaf({
      id: 4,
      name: "ورش عن نافع",
      rawi: {
        id: 2,
        name: "ورش",
        full_name: "ورش عن نافع",
        qiraa: {
          id: 1,
          name: "نافع",
          count: {
            id: 1,
            name: "ورش",
          },
        },
      },
    });

    expect(resolveQuranpediaRiwayaId(mushaf)).toBe(2);
  });

  it("distinguishes the two Duri riwayat by qiraa", () => {
    const abuAmrDuri = createMushaf({
      id: 6,
      name: "الدوري عن أبي عمرو",
      rawi: {
        id: 5,
        name: "الدوري",
        full_name: "الدوري عن أبي عمرو",
        qiraa: {
          id: 3,
          name: "أبو عمرو",
          count: {
            id: 1,
            name: "الدوري",
          },
        },
      },
    });

    const kisaiDuri = createMushaf({
      id: 999,
      name: "الدوري عن الكسائي",
      rawi: {
        id: 5,
        name: "الدوري",
        full_name: "الدوري عن الكسائي",
        qiraa: {
          id: 7,
          name: "الكسائي",
          count: {
            id: 1,
            name: "الدوري",
          },
        },
      },
    });

    expect(resolveQuranpediaRiwayaId(abuAmrDuri)).toBe(5);
    expect(resolveQuranpediaRiwayaId(kisaiDuri)).toBe(14);
  });

  it("maps nullable Quranpedia metadata to optional Domain properties", () => {
    const mushaf = mapQuranpediaMushafToDomain(
      createMushaf({
        description: null,
        bismillah: null,
      }),
    );

    expect(mushaf.description).toBeUndefined();
    expect(mushaf.bismillah).toBeUndefined();
  });

  it("rejects an unknown Quranpedia riwaya", () => {
    const mushaf = createMushaf({
      rawi: {
        id: 999,
        name: "غير معروف",
        full_name: "غير معروف",
        qiraa: {
          id: 5,
          name: "عاصم",
          count: {
            id: 999,
            name: "غير معروف",
          },
        },
      },
    });

    expect(() => resolveQuranpediaRiwayaId(mushaf)).toThrow(
      "Quranpedia riwaya not found",
    );
  });
});

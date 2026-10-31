import { describe, expect, it } from "vitest";

import type {
  QuranpediaQiraatAyah,
  QuranpediaQiraatDocument,
} from "./quranpedia-qiraat";

import { createQuranpediaQiraatIndex } from "./quranpedia-qiraat-index";

function makeAyah(
  surah = 1,
  ayah = 3,
  rawiId = 20,
  qiraaId = 10,
  audioValue: string | null = "https://example.org/audio.mp3",
): QuranpediaQiraatAyah {
  return {
    surah,
    ayah,
    qiraat: [
      {
        ayah_word: "الرَّحِيمِ مَالِكِ",
        qiraat: [
          {
            qiraa_text: "بيان اختبار",
            rewayat: [
              {
                rawi: {
                  id: rawiId,
                  name: "إدريس",
                  full_name: "إدريس بن عبد الكريم",
                  qiraa: {
                    id: qiraaId,
                    short_name: "خلف",
                    full_name: "خلف بن هشام",
                  },
                },
                audio: audioValue,
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeDocument(
  data: readonly QuranpediaQiraatAyah[] = [makeAyah()],
): QuranpediaQiraatDocument {
  return {
    license: { version: "2026-09-05" },
    schema: "/v1/ayah/{surah}/{ayah}/qiraat",
    data,
  };
}

describe("Quranpedia Qiraat index", () => {
  it("indexes ayahs and preserves the original reading structure", () => {
    const document = makeDocument();
    const index = createQuranpediaQiraatIndex(document);
    const result = index.lookup(1, 3);

    expect(index.size).toBe(1);
    expect(index.dataVersion).toBe("2026-09-05");
    expect(result.status).toBe("found");

    if (result.status === "found") {
      expect(result.entry.qiraat[0]?.ayah_word).toBe(
        "الرَّحِيمِ مَالِكِ",
      );
      expect(result.entry.qiraat[0]?.qiraat[0]?.qiraa_text).toBe(
        "بيان اختبار",
      );
      expect(
        result.entry.qiraat[0]?.qiraat[0]?.rewayat[0]?.rawi.id,
      ).toBe(20);
    }
  });

  it("preserves a reading when its audio URL is null", () => {
    const index = createQuranpediaQiraatIndex(
      makeDocument([makeAyah(1, 3, 20, 10, null)]),
    );

    const result = index.lookup(1, 3);

    expect(result.status).toBe("found");

    if (result.status === "found") {
      expect(
        result.entry.qiraat[0]?.qiraat[0]?.rewayat[0]?.rawi.id,
      ).toBe(20);

      expect(
        result.entry.qiraat[0]?.qiraat[0]?.rewayat[0]?.audio,
      ).toBeNull();
    }
  });

  it("returns an explicit missing result for an absent ayah", () => {
    const index = createQuranpediaQiraatIndex(makeDocument());

    expect(index.lookup(1, 4)).toEqual({
      status: "missing",
      surah: 1,
      ayah: 4,
    });

    expect(index.has(1, 4)).toBe(false);
  });

  it("rejects invalid coordinates", () => {
    const index = createQuranpediaQiraatIndex(makeDocument());

    expect(() => index.lookup(0, 1)).toThrow(RangeError);
    expect(() => index.lookup(115, 1)).toThrow(RangeError);
    expect(index.has(115, 1)).toBe(false);
  });

  it("rejects duplicate source coordinates", () => {
    const entry = makeAyah();

    expect(() =>
      createQuranpediaQiraatIndex(makeDocument([entry, entry])),
    ).toThrow(/Duplicate Quranpedia Qiraat coordinates/);
  });

  it("rejects an unexpected schema", () => {
    const document = makeDocument();

    const invalid = {
      ...document,
      schema: "/unexpected",
    } as QuranpediaQiraatDocument;

    expect(() => createQuranpediaQiraatIndex(invalid)).toThrow(
      /document or schema/i,
    );
  });

  it("rejects a rawi associated with two different qiraa IDs", () => {
    expect(() =>
      createQuranpediaQiraatIndex(
        makeDocument([
          makeAyah(1, 3, 20, 10),
          makeAyah(1, 4, 20, 9),
        ]),
      ),
    ).toThrow(/Inconsistent Quranpedia rawi association/);
  });
});

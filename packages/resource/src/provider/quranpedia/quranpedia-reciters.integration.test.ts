import { describe, expect, it } from "vitest";
import { createJsonGzipReader } from "../../reader/json-gzip-reader";
import { createQuranpediaRecitersLoader } from "./quranpedia-reciters";

const ROOT_PATH =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw";

describe("Quranpedia real reciters", () => {
  it("loads the real reciters index", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaRecitersLoader(reader);

    const document = await loader.read(
      `${ROOT_PATH}/reciters-index.json.gz`,
    );

    expect(document.schema).toBe("/v1/reciters");
    expect(document.data).toHaveLength(253);
  });

  it("preserves the real nested group structure", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaRecitersLoader(reader);

    const document = await loader.read(
      `${ROOT_PATH}/reciters-index.json.gz`,
    );

    const entries = document.data.flat();

    expect(entries).toHaveLength(359);

    const groupSizes = document.data.map(
      (group) => group.length,
    );

    expect(new Set(groupSizes)).toEqual(
      new Set([0, 1, 2, 3, 4, 5, 6, 9, 13]),
    );
  });

  it("contains the twenty Quranpedia rawi", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaRecitersLoader(reader);

    const document = await loader.read(
      `${ROOT_PATH}/reciters-index.json.gz`,
    );

    const rawi = new Map<number, string>();

    for (const group of document.data) {
      for (const reciter of group) {
        rawi.set(reciter.rawi.id, reciter.rawi.name);
      }
    }

    expect(rawi.size).toBe(20);
    expect(rawi.get(1)).toBe("قالون");
    expect(rawi.get(2)).toBe("ورش");
    expect(rawi.get(5)).toBe("الدوري");
    expect(rawi.get(14)).toBe("الدوري");
    expect(rawi.get(10)).toBe("حفص");
    expect(rawi.get(20)).toBe("إدريس");
  });

  it("contains the three recitation types and two classifications", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaRecitersLoader(reader);

    const document = await loader.read(
      `${ROOT_PATH}/reciters-index.json.gz`,
    );

    const entries = document.data.flat();

    const recitationTypes = new Map<number, string>();
    const classifications = new Map<number, string>();

    for (const reciter of entries) {
      recitationTypes.set(
        reciter.recitation_type.id,
        reciter.recitation_type.ar_name,
      );

      classifications.set(
        reciter.classification.id,
        reciter.classification.name,
      );
    }

    expect(recitationTypes).toEqual(
      new Map([
        [1, "مرتل"],
        [2, "مجود"],
        [3, "معلم"],
      ]),
    );

    expect(classifications).toEqual(
      new Map([
        [1, "حسب السور"],
        [2, "حسب الآيات"],
      ]),
    );
  });
});

import { describe, expect, it } from "vitest";
import { createJsonGzipReader } from "../../reader/json-gzip-reader";
import { createQuranpediaQiraatLoader } from "./quranpedia-qiraat";

const ROOT_PATH =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw";

describe("Quranpedia real qiraat", () => {
  it("loads the real qiraat document", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaQiraatLoader(reader);

    const document = await loader.read(
      `${ROOT_PATH}/qiraat.json.gz`,
    );

    expect(document.data).toHaveLength(3455);
  });

  it("contains the ten qiraa and twenty rawi", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaQiraatLoader(reader);

    const document = await loader.read(
      `${ROOT_PATH}/qiraat.json.gz`,
    );

    const qiraa = new Map<
      number,
      Set<number>
    >();

    for (const ayah of document.data) {
      for (const word of ayah.qiraat) {
        for (const reading of word.qiraat) {
          for (const rewaya of reading.rewayat) {
            const qiraaId = rewaya.rawi.qiraa.id;
            const rawiId = rewaya.rawi.id;

            if (!qiraa.has(qiraaId)) {
              qiraa.set(qiraaId, new Set());
            }

            qiraa.get(qiraaId)!.add(rawiId);
          }
        }
      }
    }

    expect([...qiraa.keys()].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);

    const rawiIds = new Set<number>();

    for (const rawiSet of qiraa.values()) {
      for (const rawiId of rawiSet) {
        rawiIds.add(rawiId);
      }
    }

    expect(rawiIds.size).toBe(20);

    for (const rawiSet of qiraa.values()) {
      expect(rawiSet.size).toBe(2);
    }
  });

  it("preserves the two distinct الدوري rawi associations", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaQiraatLoader(reader);

    const document = await loader.read(
      `${ROOT_PATH}/qiraat.json.gz`,
    );

    const associations = new Map<number, Set<number>>();

    for (const ayah of document.data) {
      for (const word of ayah.qiraat) {
        for (const reading of word.qiraat) {
          for (const rewaya of reading.rewayat) {
            if (rewaya.rawi.name !== "الدوري") {
              continue;
            }

            const qiraaId = rewaya.rawi.qiraa.id;
            const rawiId = rewaya.rawi.id;

            if (!associations.has(rawiId)) {
              associations.set(rawiId, new Set());
            }

            associations.get(rawiId)!.add(qiraaId);
          }
        }
      }
    }

    expect(associations.get(5)).toEqual(new Set([3]));
    expect(associations.get(14)).toEqual(new Set([7]));
  });
});

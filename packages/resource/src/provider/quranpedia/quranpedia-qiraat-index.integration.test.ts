import { describe, expect, it } from "vitest";

import { createJsonGzipReader } from "../../reader/json-gzip-reader";
import { createQuranpediaQiraatLoader } from "./quranpedia-qiraat";
import { createQuranpediaQiraatIndex } from "./quranpedia-qiraat-index";

const ROOT_PATH =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw";

describe("Quranpedia real Qiraat index", () => {
  it("indexes the real dataset and preserves version and ayah readings", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaQiraatLoader(reader);
    const document = await loader.read(`${ROOT_PATH}/qiraat.json.gz`);

    const index = createQuranpediaQiraatIndex(document);

    expect(index.size).toBe(3455);
    expect(index.dataVersion).toBe("2026-09-05");

    const result = index.lookup(1, 3);

    expect(result.status).toBe("found");

    if (result.status === "found") {
      expect(result.entry.qiraat.length).toBeGreaterThan(0);
      expect(result.entry.qiraat[0]?.qiraat.length).toBeGreaterThan(0);
    }
  });

  it("keeps the two distinct al-Duri IDs associated with their qiraa", async () => {
    const reader = createJsonGzipReader();
    const loader = createQuranpediaQiraatLoader(reader);
    const document = await loader.read(`${ROOT_PATH}/qiraat.json.gz`);
    const index = createQuranpediaQiraatIndex(document);
    const result = index.lookup(1, 3);

    expect(result.status).toBe("found");

    if (result.status !== "found") {
      return;
    }

    const associations = new Map<number, Set<number>>();

    for (const word of result.entry.qiraat) {
      for (const reading of word.qiraat) {
        for (const rewaya of reading.rewayat) {
          if (rewaya.rawi.name !== "الدوري") {
            continue;
          }

          const rawiId = rewaya.rawi.id;
          const qiraaId = rewaya.rawi.qiraa.id;

          if (!associations.has(rawiId)) {
            associations.set(rawiId, new Set());
          }

          associations.get(rawiId)!.add(qiraaId);
        }
      }
    }

    expect(associations.get(5)).toEqual(new Set([3]));
    expect(associations.get(14)).toEqual(new Set([7]));
  });
});

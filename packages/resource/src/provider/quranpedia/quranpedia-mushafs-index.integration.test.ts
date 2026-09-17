import { access } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { createJsonGzipReader } from "../../reader/json-gzip-reader";
import { createQuranpediaMushafsIndexLoader } from "./quranpedia-mushafs-index";

const QURANPEDIA_MUSHAFS_INDEX =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw/mushafs-index.json.gz";

describe("Quranpedia real mushafs index", () => {
  it("reads the local Quranpedia mushafs index", async () => {
    await access(QURANPEDIA_MUSHAFS_INDEX);

    const reader = createJsonGzipReader();
    const loader = createQuranpediaMushafsIndexLoader(reader);

    const result = await loader.read(QURANPEDIA_MUSHAFS_INDEX);

    expect(result.schema).toBeTruthy();
    expect(result.data).toHaveLength(12);

    for (const mushaf of result.data) {
      expect(mushaf.id).toBeTypeOf("number");
      expect(mushaf.name).toBeTypeOf("string");
      expect(mushaf.rawi.id).toBeTypeOf("number");
      expect(mushaf.rawi.name).toBeTypeOf("string");
      expect(mushaf.rawi.qiraa.id).toBeTypeOf("number");
      expect(mushaf.rawi.qiraa.short_name).toBeTypeOf("string");
    }
  });
});

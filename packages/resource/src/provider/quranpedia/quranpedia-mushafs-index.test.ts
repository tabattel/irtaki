import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createJsonGzipReader } from "../../reader/json-gzip-reader";
import { createQuranpediaMushafsIndexLoader } from "./quranpedia-mushafs-index";

const gzipAsync = promisify(gzip);

describe("QuranpediaMushafsIndexLoader", () => {
  it("reads the Quranpedia mushafs index", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "irtaki-quranpedia-mushafs-"),
    );
    const filePath = join(directory, "mushafs-index.json.gz");

    try {
      const source = {
        license: {},
        schema: "/v1/mushafs",
        data: [
          {
            id: 1,
            name: "مصحف حفص",
            rawi: {
              id: 10,
              name: "حفص",
              full_name: "حفص",
              qiraa: {
                id: 5,
                short_name: "عاصم",
                full_name: "عاصم",
              },
            },
          },
        ],
      };

      await writeFile(filePath, await gzipAsync(JSON.stringify(source)));

      const reader = createJsonGzipReader();
      const loader = createQuranpediaMushafsIndexLoader(reader);

      const result = await loader.read(filePath);

      expect(result.schema).toBe("/v1/mushafs");
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(source.data[0]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

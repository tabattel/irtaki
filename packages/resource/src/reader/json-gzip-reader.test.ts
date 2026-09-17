import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createJsonGzipReader } from "./json-gzip-reader";

const gzipAsync = promisify(gzip);

describe("JsonGzipReader", () => {
  it("reads and parses a JSON gzip file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "irtaki-json-gzip-"));
    const filePath = join(directory, "data.json.gz");

    try {
      const source = {
        license: {
          version: "test",
        },
        data: [
          {
            id: 1,
            name: "test",
          },
        ],
      };

      const compressed = await gzipAsync(JSON.stringify(source));

      await writeFile(filePath, compressed);

      const reader = createJsonGzipReader();

      const result = await reader.read<typeof source>(filePath);

      expect(result).toEqual(source);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

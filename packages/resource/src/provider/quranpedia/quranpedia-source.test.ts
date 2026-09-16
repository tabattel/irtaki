import { describe, expect, it } from "vitest";

import {
  createQuranpediaSource,
  type QuranpediaSource,
} from "./quranpedia-source";

describe("Quranpedia source", () => {
  it("represents the Quranpedia source", () => {
    const source: QuranpediaSource = createQuranpediaSource(
      "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw",
      "2026-09-11",
    );

    expect(source).toEqual({
      name: "quranpedia",
      version: "2026-09-11",
      rootPath: "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw",
    });
  });

  it("preserves the source version", () => {
    const source = createQuranpediaSource(
      "/data/quranpedia/raw",
      "2026-09-11",
    );

    expect(source.name).toBe("quranpedia");
    expect(source.version).toBe("2026-09-11");
  });

  it("preserves the configured root path", () => {
    const source = createQuranpediaSource(
      "/data/quranpedia/raw",
      "2026-09-11",
    );

    expect(source.rootPath).toBe("/data/quranpedia/raw");
  });
});

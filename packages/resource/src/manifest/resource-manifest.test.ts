import { describe, expect, it } from "vitest";

import type { ResourceManifest } from "./resource-manifest";

describe("Resource manifest", () => {
  it("represents the metadata of a resource", () => {
    const manifest: ResourceManifest = {
      identity: {
        type: "mushaf",
        scope: "surah",
        key: "hafs:1",
      },
      type: "mushaf",
      scope: "surah",
      source: "quranpedia",
      version: "2026-09-11",
      format: "json",
      size: 1024,
      checksum: "sha256:example",
    };

    expect(manifest).toEqual({
      identity: {
        type: "mushaf",
        scope: "surah",
        key: "hafs:1",
      },
      type: "mushaf",
      scope: "surah",
      source: "quranpedia",
      version: "2026-09-11",
      format: "json",
      size: 1024,
      checksum: "sha256:example",
    });
  });

  it("allows optional size and checksum", () => {
    const manifest: ResourceManifest = {
      identity: {
        type: "audio",
        scope: "surah",
        key: "hafs:1",
      },
      type: "audio",
      scope: "surah",
      source: "quranpedia",
      version: "2026-09-11",
      format: "mp3",
    };

    expect(manifest.size).toBeUndefined();
    expect(manifest.checksum).toBeUndefined();
  });
});

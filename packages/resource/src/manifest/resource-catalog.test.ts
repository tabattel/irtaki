import { describe, expect, it } from "vitest";

import {
  createResourceCatalog,
  type ResourceCatalog,
} from "./resource-catalog";

import type { ResourceManifest } from "./resource-manifest";

describe("Resource catalog", () => {
  it("registers and retrieves a resource manifest", () => {
    const catalog: ResourceCatalog = createResourceCatalog();

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
    };

    catalog.register(manifest);

    expect(catalog.get("mushaf/surah/hafs:1")).toEqual(manifest);
  });

  it("returns undefined for an unknown resource", () => {
    const catalog: ResourceCatalog = createResourceCatalog();

    expect(catalog.get("mushaf/surah/hafs:999")).toBeUndefined();
  });

  it("lists registered resource manifests", () => {
    const catalog: ResourceCatalog = createResourceCatalog();

    const firstManifest: ResourceManifest = {
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
    };

    const secondManifest: ResourceManifest = {
      identity: {
        type: "tafsir",
        scope: "surah",
        key: "book:1/surah:1",
      },
      type: "tafsir",
      scope: "surah",
      source: "quranpedia",
      version: "2026-09-11",
      format: "json",
    };

    catalog.register(firstManifest);
    catalog.register(secondManifest);

    expect(catalog.list()).toEqual([firstManifest, secondManifest]);
  });
});

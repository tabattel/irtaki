import { describe, expect, it } from "vitest";

import {
  createResourceCatalog,
  type ResourceCatalog,
} from "../manifest/resource-catalog";
import type { ResourceManifest } from "../manifest/resource-manifest";
import {
  createResourceResolver,
  type ResourceResolver,
} from "./resource-resolver";

describe("Resource resolver", () => {
  it("resolves a registered resource", () => {
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

    const resolver: ResourceResolver = createResourceResolver(catalog);

    expect(resolver.resolve("mushaf/surah/hafs:1")).toEqual(manifest);
  });

  it("returns undefined when the resource does not exist", () => {
    const catalog: ResourceCatalog = createResourceCatalog();

    const resolver: ResourceResolver = createResourceResolver(catalog);

    expect(resolver.resolve("mushaf/surah/hafs:999")).toBeUndefined();
  });

  it("resolves different resource types through the same catalog", () => {
    const catalog: ResourceCatalog = createResourceCatalog();

    const mushafManifest: ResourceManifest = {
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

    const audioManifest: ResourceManifest = {
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

    catalog.register(mushafManifest);
    catalog.register(audioManifest);

    const resolver: ResourceResolver = createResourceResolver(catalog);

    expect(resolver.resolve("mushaf/surah/hafs:1")).toEqual(
      mushafManifest,
    );

    expect(resolver.resolve("audio/surah/hafs:1")).toEqual(audioManifest);
  });
});

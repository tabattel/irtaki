import { describe, expect, it } from "vitest";

import {
  createResourceCache,
  createResourceCatalog,
  createResourceDelivery,
  createResourceResolver,
  type ResourceProvider,
} from "../index";

import { mapResourceToQuranpediaFile } from "../provider/quranpedia/quranpedia-resource-map";

describe("Resource Engine integration", () => {
  it("resolves, maps, loads and caches a Quranpedia resource", async () => {
    const catalog = createResourceCatalog();

    const resource = {
      type: "qiraat" as const,
      scope: "quran" as const,
      key: "all",
    };

    const id = "qiraat/quran/all";

    catalog.register({
      identity: resource,
      type: "qiraat",
      scope: "quran",
      source: "quranpedia",
      version: "2026-09-11",
      format: "json.gz",
    });

    const resolver = createResourceResolver(catalog);
    const manifest = resolver.resolve(id);

    expect(manifest).toBeDefined();
    expect(manifest?.identity).toEqual(resource);

    const file = mapResourceToQuranpediaFile(resource);

    expect(file).toEqual({
      name: "qiraat.json.gz",
      relativePath: "qiraat.json.gz",
      format: "json.gz",
    });

    let providerCalls = 0;

    const provider: ResourceProvider = {
      async get(resourceId) {
        providerCalls += 1;

        expect(resourceId).toBe(id);

        return {
          source: "quranpedia",
          file: file?.relativePath,
          content: "quranpedia-resource-content",
        };
      },
    };

    const cache = createResourceCache();
    const delivery = createResourceDelivery(cache, provider);

    const firstResult = await delivery.get(id);

    expect(firstResult).toEqual({
      source: "quranpedia",
      file: "qiraat.json.gz",
      content: "quranpedia-resource-content",
    });

    expect(providerCalls).toBe(1);
    expect(cache.has(id)).toBe(true);

    const secondResult = await delivery.get(id);

    expect(secondResult).toEqual(firstResult);
    expect(providerCalls).toBe(1);
  });
});

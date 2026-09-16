import { describe, expect, it } from "vitest";

import {
  createResourceCache,
  type ResourceCache,
} from "./resource-cache";

describe("Resource cache", () => {
  it("stores and retrieves resource content", () => {
    const cache: ResourceCache = createResourceCache();

    cache.set("mushaf/surah/hafs:1", {
      surah: 1,
      content: "example",
    });

    expect(cache.has("mushaf/surah/hafs:1")).toBe(true);
    expect(cache.get("mushaf/surah/hafs:1")).toEqual({
      surah: 1,
      content: "example",
    });
  });

  it("returns undefined for a resource that is not cached", () => {
    const cache: ResourceCache = createResourceCache();

    expect(cache.has("mushaf/surah/hafs:999")).toBe(false);
    expect(cache.get("mushaf/surah/hafs:999")).toBeUndefined();
  });

  it("replaces existing cached content", () => {
    const cache: ResourceCache = createResourceCache();

    cache.set("audio/surah/hafs:1", "old-content");
    cache.set("audio/surah/hafs:1", "new-content");

    expect(cache.get("audio/surah/hafs:1")).toBe("new-content");
  });

  it("deletes a cached resource", () => {
    const cache: ResourceCache = createResourceCache();

    cache.set("tafsir/surah/book:1/surah:1", {
      text: "example",
    });

    expect(cache.delete("tafsir/surah/book:1/surah:1")).toBe(true);
    expect(cache.has("tafsir/surah/book:1/surah:1")).toBe(false);
    expect(cache.get("tafsir/surah/book:1/surah:1")).toBeUndefined();
  });

  it("returns false when deleting a resource that is not cached", () => {
    const cache: ResourceCache = createResourceCache();

    expect(cache.delete("mushaf/surah/hafs:999")).toBe(false);
  });

  it("clears all cached resources", () => {
    const cache: ResourceCache = createResourceCache();

    cache.set("mushaf/surah/hafs:1", "mushaf");
    cache.set("audio/surah/hafs:1", "audio");

    cache.clear();

    expect(cache.has("mushaf/surah/hafs:1")).toBe(false);
    expect(cache.has("audio/surah/hafs:1")).toBe(false);
  });
});

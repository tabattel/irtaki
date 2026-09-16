import { describe, expect, it, vi } from "vitest";

import { createResourceCache } from "../cache/resource-cache";
import type { ResourceProvider } from "../provider/resource-provider";
import { createResourceDelivery } from "./resource-delivery";

describe("Resource delivery", () => {
  it("returns a cached resource without calling the provider", async () => {
    const cache = createResourceCache();

    const provider: ResourceProvider = {
      get: vi.fn(),
    };

    cache.set("mushaf/surah/hafs:1", {
      source: "cache",
    });

    const delivery = createResourceDelivery(cache, provider);

    await expect(
      delivery.get("mushaf/surah/hafs:1"),
    ).resolves.toEqual({
      source: "cache",
    });

    expect(provider.get).not.toHaveBeenCalled();
  });

  it("loads a missing resource from the provider", async () => {
    const cache = createResourceCache();

    const provider: ResourceProvider = {
      get: vi.fn().mockResolvedValue({
        source: "provider",
      }),
    };

    const delivery = createResourceDelivery(cache, provider);

    await expect(
      delivery.get("audio/surah/hafs:1"),
    ).resolves.toEqual({
      source: "provider",
    });

    expect(provider.get).toHaveBeenCalledWith("audio/surah/hafs:1");
  });

  it("caches content loaded from the provider", async () => {
    const cache = createResourceCache();

    const provider: ResourceProvider = {
      get: vi.fn().mockResolvedValue({
        source: "provider",
      }),
    };

    const delivery = createResourceDelivery(cache, provider);

    await delivery.get("tafsir/surah/book:1/surah:1");

    expect(cache.get("tafsir/surah/book:1/surah:1")).toEqual({
      source: "provider",
    });
  });

  it("uses the cache on subsequent requests", async () => {
    const cache = createResourceCache();

    const provider: ResourceProvider = {
      get: vi.fn().mockResolvedValue({
        source: "provider",
      }),
    };

    const delivery = createResourceDelivery(cache, provider);

    await delivery.get("mushaf/surah/hafs:1");
    await delivery.get("mushaf/surah/hafs:1");

    expect(provider.get).toHaveBeenCalledTimes(1);
  });

  it("does not cache undefined provider results", async () => {
    const cache = createResourceCache();

    const provider: ResourceProvider = {
      get: vi.fn().mockResolvedValue(undefined),
    };

    const delivery = createResourceDelivery(cache, provider);

    await expect(
      delivery.get("mushaf/surah/hafs:999"),
    ).resolves.toBeUndefined();

    expect(cache.has("mushaf/surah/hafs:999")).toBe(false);
  });
});

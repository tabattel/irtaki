import { describe, expect, it } from "vitest";

import type { ResourceId } from "../resource/resource";
import type { ResourceProvider } from "./resource-provider";

describe("Resource provider", () => {
  it("provides the content of a resource", async () => {
    const resourceId: ResourceId = "mushaf/surah/hafs:1";

    const provider: ResourceProvider = {
      async get(id) {
        expect(id).toBe(resourceId);

        return {
          type: "mushaf",
          surah: 1,
        };
      },
    };

    await expect(provider.get(resourceId)).resolves.toEqual({
      type: "mushaf",
      surah: 1,
    });
  });

  it("can provide different resource contents", async () => {
    const provider: ResourceProvider = {
      async get(id) {
        if (id === "mushaf/surah/hafs:1") {
          return {
            type: "mushaf",
            surah: 1,
          };
        }

        if (id === "audio/surah/hafs:1") {
          return {
            type: "audio",
            surah: 1,
          };
        }

        return undefined;
      },
    };

    await expect(
      provider.get("mushaf/surah/hafs:1"),
    ).resolves.toEqual({
      type: "mushaf",
      surah: 1,
    });

    await expect(
      provider.get("audio/surah/hafs:1"),
    ).resolves.toEqual({
      type: "audio",
      surah: 1,
    });
  });

  it("supports asynchronous resource loading", async () => {
    const provider: ResourceProvider = {
      async get(id) {
        return {
          id,
          loaded: true,
        };
      },
    };

    await expect(
      provider.get("tafsir/surah/book:1/surah:1"),
    ).resolves.toEqual({
      id: "tafsir/surah/book:1/surah:1",
      loaded: true,
    });
  });
});

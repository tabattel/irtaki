import { describe, expect, it } from "vitest";

import {
  createOfflinePackCatalog,
  type OfflinePack,
  type OfflinePackCatalog,
} from "./offline-pack";

describe("Offline packs", () => {
  it("represents an offline pack", () => {
    const pack: OfflinePack = {
      id: "hafs-surah-1",
      name: "Hafs — Sourate 1",
      resources: [
        "mushaf/surah/hafs:1",
        "audio/surah/hafs:1",
      ],
      status: "available",
    };

    expect(pack).toEqual({
      id: "hafs-surah-1",
      name: "Hafs — Sourate 1",
      resources: [
        "mushaf/surah/hafs:1",
        "audio/surah/hafs:1",
      ],
      status: "available",
    });
  });

  it("registers and retrieves an offline pack", () => {
    const catalog: OfflinePackCatalog = createOfflinePackCatalog();

    const pack: OfflinePack = {
      id: "hafs-surah-1",
      name: "Hafs — Sourate 1",
      resources: [
        "mushaf/surah/hafs:1",
        "audio/surah/hafs:1",
      ],
      status: "available",
    };

    catalog.register(pack);

    expect(catalog.get("hafs-surah-1")).toEqual(pack);
  });

  it("returns undefined for an unknown pack", () => {
    const catalog = createOfflinePackCatalog();

    expect(catalog.get("unknown")).toBeUndefined();
  });

  it("lists registered offline packs", () => {
    const catalog = createOfflinePackCatalog();

    const first: OfflinePack = {
      id: "hafs-surah-1",
      name: "Hafs — Sourate 1",
      resources: ["mushaf/surah/hafs:1"],
      status: "available",
    };

    const second: OfflinePack = {
      id: "hafs-surah-2",
      name: "Hafs — Sourate 2",
      resources: ["mushaf/surah/hafs:2"],
      status: "partial",
    };

    catalog.register(first);
    catalog.register(second);

    expect(catalog.list()).toEqual([first, second]);
  });

  it("supports a pending offline pack", () => {
    const pack: OfflinePack = {
      id: "hafs-surah-3",
      name: "Hafs — Sourate 3",
      resources: ["audio/surah/hafs:3"],
      status: "pending",
    };

    expect(pack.status).toBe("pending");
  });
});

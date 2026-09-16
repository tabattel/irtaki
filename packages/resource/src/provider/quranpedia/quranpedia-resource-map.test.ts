import { describe, expect, it } from "vitest";

import { mapResourceToQuranpediaFile } from "./quranpedia-resource-map";

describe("Quranpedia resource mapping", () => {
  it("maps a qiraat resource to qiraat.json.gz", () => {
    const file = mapResourceToQuranpediaFile({
      type: "qiraat",
      scope: "quran",
      key: "all",
    });

    expect(file).toEqual({
      name: "qiraat.json.gz",
      relativePath: "qiraat.json.gz",
      format: "json.gz",
    });
  });

  it("maps a mushaf resource to mushafs-index.json.gz", () => {
    const file = mapResourceToQuranpediaFile({
      type: "mushaf",
      scope: "quran",
      key: "all",
    });

    expect(file).toEqual({
      name: "mushafs-index.json.gz",
      relativePath: "mushafs-index.json.gz",
      format: "json.gz",
    });
  });

  it("returns undefined for a resource without a mapping", () => {
    const file = mapResourceToQuranpediaFile({
      type: "tafsir",
      scope: "book",
      key: "book:1",
    });

    expect(file).toBeUndefined();
  });
});

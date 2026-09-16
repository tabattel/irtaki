import { describe, expect, it } from "vitest";

import {
  createQuranpediaCatalog,
  type QuranpediaCatalog,
} from "./quranpedia-catalog";

import { createQuranpediaFile } from "./quranpedia-file";

describe("Quranpedia catalog", () => {
  it("registers and retrieves a Quranpedia file", () => {
    const catalog: QuranpediaCatalog = createQuranpediaCatalog();

    const file = createQuranpediaFile(
      "qiraat.json.gz",
      "qiraat.json.gz",
      "json.gz",
    );

    catalog.register(file);

    expect(catalog.get("qiraat.json.gz")).toEqual(file);
  });

  it("returns undefined for an unknown file", () => {
    const catalog = createQuranpediaCatalog();

    expect(catalog.get("unknown.json.gz")).toBeUndefined();
  });

  it("lists registered files", () => {
    const catalog = createQuranpediaCatalog();

    const first = createQuranpediaFile(
      "qiraat.json.gz",
      "qiraat.json.gz",
      "json.gz",
    );

    const second = createQuranpediaFile(
      "mushafs-index.json.gz",
      "mushafs-index.json.gz",
      "json.gz",
    );

    catalog.register(first);
    catalog.register(second);

    expect(catalog.list()).toEqual([first, second]);
  });
});

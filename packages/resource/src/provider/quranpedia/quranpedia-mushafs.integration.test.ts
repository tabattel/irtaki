import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createJsonGzipReader } from "../../reader/json-gzip-reader";
import { createQuranpediaMushafLoader } from "./quranpedia-mushaf";
import { createQuranpediaMushafs } from "./quranpedia-mushafs";
import { createQuranpediaRiwayaCatalog } from "./quranpedia-riwayat";
import { createQuranpediaMushafsIndexLoader } from "./quranpedia-mushafs-index";

const ROOT_PATH =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw";

describe("Quranpedia real mushafs", () => {
  it("discovers exactly the 12 mushafs from the real index", async () => {
    const reader = createJsonGzipReader();
    const indexLoader = createQuranpediaMushafsIndexLoader(reader);

    const mushafs = createQuranpediaMushafs({
      rootPath: ROOT_PATH,
      reader,
      indexLoader,
      riwayaCatalog: createQuranpediaRiwayaCatalog(
        await indexLoader.read(`${ROOT_PATH}/mushafs-index.json.gz`).then((index) => index.data),
      ),
    });

    const result = await mushafs.list();

    expect(result).toHaveLength(12);
    expect(result.map((mushaf) => mushaf.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it("loads the selected Hafs mushaf 2", async () => {
    const reader = createJsonGzipReader();
    const indexLoader = createQuranpediaMushafsIndexLoader(reader);

    const mushafs = createQuranpediaMushafs({
      rootPath: ROOT_PATH,
      reader,
      indexLoader,
      riwayaCatalog: createQuranpediaRiwayaCatalog(
        await indexLoader.read(`${ROOT_PATH}/mushafs-index.json.gz`).then((index) => index.data),
      ),
    });

    const result = await mushafs.load(2);

    expect(result.schema).toBe("/v1/mushafs/2");
    expect(result.data.id).toBe(2);
    expect(result.data.name).toBe("مصحف حفص نسخة نصية");
    expect(result.data.surahs).toHaveLength(114);
    expect(result.data.rawi.name).toBe("حفص");
  });

  it("loads the selected Warsh mushaf 4", async () => {
    const reader = createJsonGzipReader();
    const indexLoader = createQuranpediaMushafsIndexLoader(reader);

    const mushafs = createQuranpediaMushafs({
      rootPath: ROOT_PATH,
      reader,
      indexLoader,
      riwayaCatalog: createQuranpediaRiwayaCatalog(
        await indexLoader.read(`${ROOT_PATH}/mushafs-index.json.gz`).then((index) => index.data),
      ),
    });

    const result = await mushafs.load(4);

    expect(result.schema).toBe("/v1/mushafs/4");
    expect(result.data.id).toBe(4);
    expect(result.data.name).toBe("مصحف ورش");
    expect(result.data.surahs).toHaveLength(114);
    expect(result.data.rawi.name).toBe("ورش");
  });

  it("loads the selected Qalun mushaf 7", async () => {
    const reader = createJsonGzipReader();
    const indexLoader = createQuranpediaMushafsIndexLoader(reader);

    const mushafs = createQuranpediaMushafs({
      rootPath: ROOT_PATH,
      reader,
      indexLoader,
      riwayaCatalog: createQuranpediaRiwayaCatalog(
        await indexLoader.read(`${ROOT_PATH}/mushafs-index.json.gz`).then((index) => index.data),
      ),
    });

    const result = await mushafs.load(7);

    expect(result.schema).toBe("/v1/mushafs/7");
    expect(result.data.id).toBe(7);
    expect(result.data.name).toBe("مصحف قالون");
    expect(result.data.surahs).toHaveLength(114);
    expect(result.data.rawi.name).toBe("قالون");
  });

  it("keeps every real mushaf file readable", async () => {
    for (let id = 1; id <= 12; id += 1) {
      const path = `${ROOT_PATH}/mushafs-${id}.json.gz`;
      await access(path);

      const reader = createJsonGzipReader();
      const loader = createQuranpediaMushafLoader(reader);

      const result = await loader.read(path);

      expect(result.schema).toBe(`/v1/mushafs/${id}`);
      expect(result.data.id).toBe(id);
      expect(result.data.surahs).toHaveLength(114);
    }
  });
});

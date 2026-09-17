import { describe, expect, it } from "vitest";
import type { JsonGzipReader } from "../../reader/json-gzip-reader";
import type { QuranpediaMushafsIndex } from "./quranpedia-mushafs-index";
import {
  createQuranpediaMushafs,
  type QuranpediaMushafsOptions,
} from "./quranpedia-mushafs";

describe("QuranpediaMushafs", () => {
  it("loads a mushaf using the id from the Quranpedia index", async () => {
    const calls: string[] = [];

    const reader: JsonGzipReader = {
      async read<T>(filePath: string): Promise<T> {
        calls.push(filePath);

        if (filePath.endsWith("mushafs-index.json.gz")) {
          return {
            license: {},
            schema: "/v1/mushafs",
            data: [
              {
                id: 1,
                name: "مصحف حفص",
                rawi: {
                  id: 10,
                  name: "حفص",
                  full_name: "بن سليمان",
                  qiraa: {
                    id: 5,
                    short_name: "حفص",
                    full_name: "حفص عن عاصم",
                  },
                },
              },
              {
                id: 4,
                name: "مصحف ورش",
                rawi: {
                  id: 2,
                  name: "ورش",
                  full_name: "عثمان بن سعيد",
                  qiraa: {
                    id: 1,
                    short_name: "نافع",
                    full_name: "نافع المدني",
                  },
                },
              },
            ],
          } as T;
        }

        return {
          license: {},
          schema: `/v1/mushafs/${filePath.includes("mushafs-4") ? 4 : 1}`,
          data: {
            id: filePath.includes("mushafs-4") ? 4 : 1,
            name: filePath.includes("mushafs-4")
              ? "مصحف ورش"
              : "مصحف حفص",
            rawi: {},
            surahs: [],
          },
        } as T;
      },
    };

    const indexLoader = {
      read: (filePath: string) =>
        reader.read<QuranpediaMushafsIndex>(filePath),
    };

    const options: QuranpediaMushafsOptions = {
      rootPath: "/quranpedia/raw",
      reader,
      indexLoader,
      riwayaCatalog: {
        list: () => [],
      },
    };

    const mushafs = createQuranpediaMushafs(options);

    const result = await mushafs.load(4);

    expect(result.data.id).toBe(4);
    expect(result.data.name).toBe("مصحف ورش");

    expect(calls).toEqual([
      "/quranpedia/raw/mushafs-index.json.gz",
      "/quranpedia/raw/mushafs-4.json.gz",
    ]);
  });

  it("lists the mushafs from the Quranpedia index", async () => {
    const reader: JsonGzipReader = {
      async read<T>(): Promise<T> {
        return {
          license: {},
          schema: "/v1/mushafs",
          data: [
            {
              id: 1,
              name: "مصحف حفص",
              rawi: {},
            },
            {
              id: 4,
              name: "مصحف ورش",
              rawi: {},
            },
          ],
        } as T;
      },
    };

    const indexLoader = {
      read: (filePath: string) =>
        reader.read<QuranpediaMushafsIndex>(filePath),
    };

    const mushafs = createQuranpediaMushafs({
      rootPath: "/quranpedia/raw",
      reader,
      indexLoader,
      riwayaCatalog: {
        list: () => [],
      },
    });

    const result = await mushafs.list();

    expect(result).toHaveLength(2);
    expect(result.map((mushaf) => mushaf.id)).toEqual([1, 4]);
  });

  it("rejects an unknown mushaf id", async () => {
    const reader: JsonGzipReader = {
      async read<T>(): Promise<T> {
        return {
          license: {},
          schema: "/v1/mushafs",
          data: [
            {
              id: 1,
              name: "مصحف حفص",
              rawi: {},
            },
          ],
        } as T;
      },
    };

    const indexLoader = {
      read: (filePath: string) =>
        reader.read<QuranpediaMushafsIndex>(filePath),
    };

    const mushafs = createQuranpediaMushafs({
      rootPath: "/quranpedia/raw",
      reader,
      indexLoader,
      riwayaCatalog: {
        list: () => [],
      },
    });

    await expect(mushafs.load(999)).rejects.toThrow(
      "Quranpedia mushaf not found: 999",
    );
  });
});

import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createJsonGzipReader } from "../../reader/json-gzip-reader";
import { createQuranpediaMushafLoader } from "./quranpedia-mushaf";

const gzipAsync = promisify(gzip);

describe("QuranpediaMushafLoader", () => {
  it("reads a Quranpedia mushaf document", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "irtaki-quranpedia-mushaf-"),
    );
    const filePath = join(directory, "mushafs-1.json.gz");

    try {
      const source = {
        license: {},
        schema: "/v1/mushafs/1",
        data: {
          id: 1,
          name: "مصحف حفص",
          description: "test",
          image: null,
          bismillah: "بِسْمِ اللَّهِ",
          font_file: null,
          images: null,
          images_png: null,
          rawi: {
            id: 10,
            name: "حفص",
            full_name: "بن سليمان بن المغيرة",
            qiraa: {
              id: 5,
              name: null,
              count: {
                id: 6,
                name: "الكوفي",
              },
            },
          },
          surahs: [
            {
              id: 1,
              name: "سورة الفاتحة",
              coded_name: "ﮍ",
              ayahs: [
                {
                  id: 1,
                  number: 1,
                  surah: "1",
                  page_number: 1,
                  text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
                  marker: "ﰀ",
                  juz: 1,
                  hizb: 1,
                  ruku: 1,
                  manzil: 1,
                  options: ["tafsir", "meanings"],
                  number_in_hafs: [1],
                },
              ],
            },
          ],
        },
      };

      await writeFile(filePath, await gzipAsync(JSON.stringify(source)));

      const reader = createJsonGzipReader();
      const loader = createQuranpediaMushafLoader(reader);

      const result = await loader.read(filePath);

      expect(result.schema).toBe("/v1/mushafs/1");
      expect(result.data.id).toBe(1);
      expect(result.data.name).toBe("مصحف حفص");

      expect(result.data.rawi.id).toBe(10);
      expect(result.data.rawi.name).toBe("حفص");
      expect(result.data.rawi.qiraa.id).toBe(5);
      expect(result.data.rawi.qiraa.count.id).toBe(6);

      expect(result.data.surahs).toHaveLength(1);
      expect(result.data.surahs[0].id).toBe(1);
      expect(result.data.surahs[0].ayahs).toHaveLength(1);

      expect(result.data.surahs[0].ayahs[0].text).toBe(
        "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      );
      expect(result.data.surahs[0].ayahs[0].page_number).toBe(1);
      expect(result.data.surahs[0].ayahs[0].number_in_hafs).toEqual([1]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

import { describe, expect, it } from "vitest";

import type { JsonGzipReader } from "../../reader/json-gzip-reader";
import {
  createQuranpediaSurahsIndexLoader,
  type QuranpediaSurahsIndexDocument,
} from "./quranpedia-surahs-index";

describe("QuranpediaSurahsIndexLoader", () => {
  it("reads the Quranpedia surahs index document", async () => {
    const document: QuranpediaSurahsIndexDocument = {
      license: null,
      schema: "/v1/surahs",
      data: [
        {
          id: 1,
          name: "سورة الفاتحة",
          coded_name: "ﮍ",
          translated_name: "الفاتحة",
          number_of_ayahs: 7,
          first_page: 1,
          last_page: 1,
          first_juz: 1,
          revelation_type: "مكية",
          revelation_order: 5,
        },
      ],
    };

    const reader: JsonGzipReader = {
      async read<T>(): Promise<T> {
        return document as T;
      },
    };

    const loader = createQuranpediaSurahsIndexLoader(reader);
    const result = await loader.read("surahs-index.json.gz");

    expect(result.schema).toBe("/v1/surahs");
    expect(result.data).toHaveLength(1);

    expect(result.data[0]).toEqual({
      id: 1,
      name: "سورة الفاتحة",
      coded_name: "ﮍ",
      translated_name: "الفاتحة",
      number_of_ayahs: 7,
      first_page: 1,
      last_page: 1,
      first_juz: 1,
      revelation_type: "مكية",
      revelation_order: 5,
    });
  });
});

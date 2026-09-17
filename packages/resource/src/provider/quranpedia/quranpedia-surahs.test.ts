import { describe, expect, it } from "vitest";

import type { JsonGzipReader } from "../../reader/json-gzip-reader";
import {
  createQuranpediaSurahsLoader,
  type QuranpediaSurahsDocument,
} from "./quranpedia-surahs";

describe("QuranpediaSurahsLoader", () => {
  it("reads the Quranpedia surahs document", async () => {
    const document: QuranpediaSurahsDocument = {
      license: null,
      schema: "/v1/surah/information/{surah}",
      data: [
        {
          surah: 1,
          information: {
            introduction: {
              title: "نبذة عن السورة",
              value: "<p>مقدمة</p>",
            },
            surah_number: {
              title: "ترتيبها المصحفي",
              value: "1",
            },
            surah_type: {
              title: "نوعها",
              value: "مكية",
            },
            words_count: {
              title: " ألفاظها",
              value: "29",
            },
            descent: {
              title: "ترتيب نزولها",
              value: "5",
            },
            grace: {
              title: "فضلها",
              value: null,
            },
            prophet: {
              title: "ما تعلق بها من هدي النبي صلى الله عليه وسلم",
              value: null,
            },
            revelation: {
              title: "أسباب النزول",
              value: null,
            },
            topics: {
              title: "موضوعاتها",
              value: "<p>موضوعات</p>",
            },
            purposes: {
              title: "مقاصدها",
              value: null,
            },
            asmaoha: {
              title: "أسماؤها",
              value: "<p>أسماء</p>",
            },
            ayahs_count: [
              {
                title: "العد المدني الأول",
                value: 7,
              },
              {
                title: "العد المدني الأخير",
                value: 7,
              },
              {
                title: "العد المكي",
                value: 7,
              },
              {
                title: "العد الشامي",
                value: 7,
              },
              {
                title: "العد الكوفي",
                value: 7,
              },
            ],
          },
        },
      ],
    };

    const reader: JsonGzipReader = {
      async read<T>(): Promise<T> {
        return document as T;
      },
    };

    const loader = createQuranpediaSurahsLoader(reader);
    const result = await loader.read("surahs.json.gz");

    expect(result.schema).toBe("/v1/surah/information/{surah}");
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.surah).toBe(1);

    expect(result.data[0]?.information.surah_number.value).toBe("1");
    expect(result.data[0]?.information.surah_type.value).toBe("مكية");

    expect(result.data[0]?.information.ayahs_count).toHaveLength(5);
    expect(result.data[0]?.information.ayahs_count[0]?.value).toBe(7);
  });
});

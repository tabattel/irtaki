import { describe, expect, it } from "vitest";
import {
  createQuranpediaRecitersLoader,
  type QuranpediaRecitersDocument,
} from "./quranpedia-reciters";

describe("QuranpediaRecitersLoader", () => {
  it("reads a Quranpedia reciters document through the reader", async () => {
    const calls: string[] = [];

    const reader = {
      async read<T>(filePath: string): Promise<T> {
        calls.push(filePath);

        return {
          license: {},
          schema: "/v1/reciters",
          data: [
            [
              {
                id: 1,
                name: "مصحف إبراهيم الأخضر برواية حفص عن عاصم",
                surahs_list: [1, 2, 3],
                timing_url: null,
                server:
                  "https://verse.mp3quran.net/arabic/ibrahim_alakhdar/32/",
                rawi: {
                  id: 10,
                  name: "حفص",
                },
                recitation_type: {
                  id: 1,
                  ar_name: "مرتل",
                },
                classification: {
                  id: 2,
                  name: "حسب الآيات",
                },
              },
            ],
          ],
        } as T;
      },
    };

    const loader = createQuranpediaRecitersLoader(reader);

    const result = await loader.read(
      "/data/reciters-index.json.gz",
    );

    expect(calls).toEqual(["/data/reciters-index.json.gz"]);

    const document = result as QuranpediaRecitersDocument;

    expect(document.schema).toBe("/v1/reciters");
    expect(document.data).toHaveLength(1);
    expect(document.data[0]).toHaveLength(1);

    const reciter = document.data[0][0];

    expect(reciter.id).toBe(1);
    expect(reciter.name).toContain("إبراهيم الأخضر");
    expect(reciter.surahs_list).toEqual([1, 2, 3]);
    expect(reciter.timing_url).toBeNull();
    expect(reciter.rawi.id).toBe(10);
    expect(reciter.rawi.name).toBe("حفص");
    expect(reciter.recitation_type.id).toBe(1);
    expect(reciter.recitation_type.ar_name).toBe("مرتل");
    expect(reciter.classification.id).toBe(2);
    expect(reciter.classification.name).toBe("حسب الآيات");
  });
});

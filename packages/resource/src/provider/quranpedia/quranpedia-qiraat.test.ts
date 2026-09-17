import { describe, expect, it } from "vitest";
import {
  createQuranpediaQiraatLoader,
  type QuranpediaQiraatDocument,
} from "./quranpedia-qiraat";

describe("QuranpediaQiraatLoader", () => {
  it("reads a Quranpedia qiraat document through the reader", async () => {
    const calls: string[] = [];

    const reader = {
      async read<T>(filePath: string): Promise<T> {
        calls.push(filePath);

        return {
          license: {},
          schema: "/v1/qiraat",
          data: [
            {
              surah: 1,
              ayah: 3,
              qiraat: [
                {
                  ayah_word: "الرَّحِيمِ مَالِكِ",
                  qiraat: [
                    {
                      qiraa_text: "test",
                      rewayat: [
                        {
                          rawi: {
                            id: 20,
                            name: "إدريس",
                            full_name: "إدريس بن عبد الكريم",
                            qiraa: {
                              id: 10,
                              short_name: "خلف",
                              full_name: "خلف بن هشام",
                            },
                          },
                          audio:
                            "https://files.quranpedia.net/recitations/288/001003.mp3",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        } as T;
      },
    };

    const loader = createQuranpediaQiraatLoader(reader);

    const result = await loader.read(
      "/data/qiraat.json.gz",
    );

    expect(calls).toEqual(["/data/qiraat.json.gz"]);

    const document = result as QuranpediaQiraatDocument;

    expect(document.data).toHaveLength(1);
    expect(document.data[0].surah).toBe(1);
    expect(document.data[0].ayah).toBe(3);

    const word = document.data[0].qiraat[0];
    expect(word.ayah_word).toBe("الرَّحِيمِ مَالِكِ");

    const reading = word.qiraat[0];
    expect(reading.qiraa_text).toBe("test");

    const rewaya = reading.rewayat[0];
    expect(rewaya.rawi.id).toBe(20);
    expect(rewaya.rawi.name).toBe("إدريس");
    expect(rewaya.rawi.qiraa.id).toBe(10);
    expect(rewaya.rawi.qiraa.short_name).toBe("خلف");
    expect(rewaya.audio).toContain("288/001003.mp3");
  });
});

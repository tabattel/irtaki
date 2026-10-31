import { describe, expect, it } from "vitest";

import type { JsonGzipReader } from "../../reader/json-gzip-reader";
import { createQuranpediaSimilarLoader } from "./quranpedia-similar-loader";
import { createQuranpediaSimilarIndex } from "./quranpedia-similar-index";
import type { QuranpediaSimilarDocument } from "./quranpedia-similar-types";

const attachment = {
  id: 100,
  name: null,
  file_name: "attachments/images/example.jpg",
  attachment_type_id: 3,
};

function makeReference() {
  return {
    info: {
      id: 9,
      number: 2,
      text: "ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ",
      font: "page_2",
      surah_id: 2,
      surah: {
        id: 2,
        name: "سورة البقرة",
        coded_name: "ﮎ",
        translated_name: "{\"ar\":\"البقرة\"}",
        number_of_ayahs: 286,
        first_page: 2,
      },
      juz: 1,
      hizb: 1,
      page_number: 2,
      marker: "ﭜ",
    },
    text: "ذَٰلِكَ ٱلۡكِتَٰبُ <span>ﰁ</span>",
    ayah_ids: [9],
    ayah_to_number: null,
  };
}

function makeGroup() {
  return {
    notes: "ضبط مواضع (الكتاب لا ريب فيه)",
    images: [attachment],
    youtube: {
      "1": {
        id: 200,
        name: null,
        file_name: "https://www.youtube.com/embed/example",
      },
    },
    ayahs: [makeReference()],
    websites: [],
  };
}

function makeDocument(
  data: unknown[] = [
    {
      surah: 2,
      ayah: 2,
      similar: [makeGroup()],
    },
  ],
): unknown {
  return {
    license: {
      source: "https://quranpedia.net",
      version: "2026-10-31",
    },
    schema: "/v1/ayah/{surah}/{ayah}/similar",
    data,
  };
}

function makeLoader(raw: unknown) {
  const reader: JsonGzipReader = {
    async read<T>() {
      return raw as T;
    },
  };

  return createQuranpediaSimilarLoader(reader);
}

describe("Quranpedia Similar loader", () => {
  it("preserves all original fields and both media metadata formats", async () => {
    const raw = makeDocument();
    const loader = makeLoader(raw);

    const result = await loader.read("/virtual/similar.json.gz");

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.similar[0]?.notes).toBe(
      "ضبط مواضع (الكتاب لا ريب فيه)",
    );
    expect(result.data[0]?.similar[0]?.images[0]?.file_name).toBe(
      "attachments/images/example.jpg",
    );
    expect(result.data[0]?.similar[0]?.youtube).toHaveProperty("1");
    expect(result.data[0]?.similar[0]?.ayahs[0]?.info.surah.name).toBe(
      "سورة البقرة",
    );
    expect(result.data[0]?.similar[0]?.ayahs[0]?.text).toContain("<span>");
    expect(result).toEqual(raw);
  });

  it("accepts YouTube attachments as an array", async () => {
    const raw = makeDocument([
      {
        surah: 1,
        ayah: 1,
        similar: [
          {
            ...makeGroup(),
            youtube: [
              {
                id: 201,
                name: null,
                file_name: "https://www.youtube.com/embed/example",
              },
            ],
          },
        ],
      },
    ]);

    const result = await makeLoader(raw).read("/virtual/similar.json.gz");

    expect(Array.isArray(result.data[0]?.similar[0]?.youtube)).toBe(true);
  });

  it("rejects an unexpected schema", async () => {
    const raw = makeDocument();
    (raw as { schema: string }).schema = "/unexpected";

    await expect(
      makeLoader(raw).read("/virtual/similar.json.gz"),
    ).rejects.toThrow(/schema/i);
  });

  it("rejects duplicate source coordinates", async () => {
    const entry = {
      surah: 2,
      ayah: 2,
      similar: [makeGroup()],
    };

    await expect(
      makeLoader(makeDocument([entry, entry])).read(
        "/virtual/similar.json.gz",
      ),
    ).rejects.toThrow(/Duplicate/);
  });

  it("rejects malformed ayah references", async () => {
    const raw = makeDocument([
      {
        surah: 2,
        ayah: 2,
        similar: [
          {
            ...makeGroup(),
            ayahs: [{ info: {}, text: "", ayah_ids: [] }],
          },
        ],
      },
    ]);

    await expect(
      makeLoader(raw).read("/virtual/similar.json.gz"),
    ).rejects.toThrow(/ayah information/i);
  });
});

describe("Quranpedia Similar index", () => {
  it("looks up a source ayah and returns its original groups", async () => {
    const document = await makeLoader(makeDocument()).read(
      "/virtual/similar.json.gz",
    );

    const index = createQuranpediaSimilarIndex(document);
    const result = index.lookup(2, 2);

    expect(index.size).toBe(1);
    expect(index.dataVersion).toBe("2026-10-31");
    expect(result.status).toBe("found");

    if (result.status === "found") {
      expect(result.entry.similar).toEqual(document.data[0]?.similar);
    }
  });

  it("returns an explicit missing result for an absent ayah", async () => {
    const document = await makeLoader(makeDocument()).read(
      "/virtual/similar.json.gz",
    );

    const index = createQuranpediaSimilarIndex(document);

    expect(index.lookup(2, 3)).toEqual({
      status: "missing",
      surah: 2,
      ayah: 3,
    });
  });

  it("rejects invalid coordinates", async () => {
    const document = await makeLoader(makeDocument()).read(
      "/virtual/similar.json.gz",
    );

    const index = createQuranpediaSimilarIndex(document);

    expect(() => index.lookup(0, 1)).toThrow(RangeError);
    expect(index.has(115, 1)).toBe(false);
  });
});

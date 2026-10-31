import { describe, expect, it } from "vitest";
import { createQuranpediaTafsirCatalog } from "./quranpedia-tafsir-catalog";
import { createQuranpediaTafsirIndex } from "./quranpedia-tafsir-index";
import { createQuranpediaTafsirLoader } from "./quranpedia-tafsir-loader";
import { parseQuranpediaTafsirHtml } from "./quranpedia-tafsir-html";
import type { JsonGzipReader } from "../../reader/json-gzip-reader";

function documentWith(ayahs: unknown[]) {
  return {
    license: {},
    book: { id: 272, name: "تفسير الجلالين" },
    schema: "/v1/ayah/{surah}/{ayah}/book/272",
    ayahs,
  };
}

describe("Quranpedia Tafsir catalog", () => {
  it("contains the two V1 books and supports the future Autres category", () => {
    const catalog = createQuranpediaTafsirCatalog();
    expect(catalog.getBySourceBookId("quranpedia", 2012)?.category).toBe("v1");
    expect(catalog.getBySourceBookId("quranpedia", 272)?.category).toBe("v1");
    expect(catalog.getByCategory("autres")).toEqual([]);
    expect(catalog.getByCategory("v1")).toHaveLength(2);
  });

  it("rejects duplicate catalog identities", () => {
    const catalog = createQuranpediaTafsirCatalog();
    const entry = catalog.entries[0]!;
    expect(() => createQuranpediaTafsirCatalog([entry])).toThrow(/Duplicate/);
  });
});

describe("Quranpedia Tafsir loader", () => {
  it("validates the document and expected book ID", async () => {
    const reader: JsonGzipReader = {
      async read<T>() {
        return documentWith([
          { surah: 1, ayah: 2, content: [{ text: "commentaire", part: "1", page: 2 }] },
        ]) as T;
      },
    };
    const loader = createQuranpediaTafsirLoader(reader);
    const result = await loader.read("/virtual/tafsir.json.gz", 272);
    expect(result.ayahs).toHaveLength(1);
    await expect(loader.read("/virtual/tafsir.json.gz", 2012)).rejects.toThrow(/mismatch/);
  });

  it("rejects duplicate coordinates and empty content", async () => {
    const raw = documentWith([
      { surah: 1, ayah: 1, content: [{ text: "a" }] },
      { surah: 1, ayah: 1, content: [{ text: "b" }] },
    ]);
    const loader = createQuranpediaTafsirLoader({
      async read<T>() { return raw as T; },
    });
    await expect(loader.read("/virtual/tafsir.json.gz")).rejects.toThrow(/Duplicate/);

    const empty = createQuranpediaTafsirLoader({
      async read<T>() {
        return documentWith([{ surah: 1, ayah: 1, content: [] }]) as T;
      },
    });
    await expect(empty.read("/virtual/tafsir.json.gz")).rejects.toThrow(/at least one/);
  });
});

describe("Quranpedia Tafsir index", () => {
  it("finds by coordinate regardless of source order and returns explicit missing", () => {
    const document = documentWith([
      { surah: 2, ayah: 1, content: [{ text: "b" }] },
      { surah: 1, ayah: 2, content: [{ text: "a" }] },
    ]) as ReturnType<typeof documentWith> & {
      book: { id: number; name: string };
      ayahs: { surah: number; ayah: number; content: { text: string }[] }[];
    };
    const index = createQuranpediaTafsirIndex("jalalayn", document);
    expect(index.lookup(1, 2).status).toBe("found");
    expect(index.lookup(1, 1)).toEqual({
      status: "missing", bookId: "jalalayn", surah: 1, ayah: 1,
    });
    expect(index.size).toBe(2);
  });

  it("rejects invalid coordinates", () => {
    const index = createQuranpediaTafsirIndex(
      "test",
      documentWith([]) as never,
    );
    expect(() => index.lookup(0, 1)).toThrow(RangeError);
    expect(index.has(115, 1)).toBe(false);
  });
});

describe("safe Tafsir HTML parser", () => {
  it("preserves allowed Quran highlighting and strips unsafe elements and attributes", () => {
    const ast = parseQuranpediaTafsirHtml(
      '<p onclick="alert(1)" class="text-center unknown"><span class="book-ayah text-primary" style="color:red">نص</span><script>alert(1)</script><img src="https://example.test/x.png"></p>',
    );
    const serialized = JSON.stringify(ast);
    expect(serialized).toContain("book-ayah");
    expect(serialized).toContain("text-primary");
    expect(serialized).toContain("text-center");
    expect(serialized).not.toContain("onclick");
    expect(serialized).not.toContain("alert");
    expect(serialized).not.toContain("example.test");
    expect(serialized).not.toContain("style");
  });

  it("keeps plain text and handles malformed HTML without throwing", () => {
    expect(parseQuranpediaTafsirHtml("تفسير عربي")[0]).toEqual({
      type: "text", value: "تفسير عربي",
    });
    expect(() => parseQuranpediaTafsirHtml('<spanclass="bad">{broken')).not.toThrow();
  });
});

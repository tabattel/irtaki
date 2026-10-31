import { describe, expect, it } from "vitest";
import { createJsonGzipReader } from "../../reader/json-gzip-reader";
import { createQuranpediaTafsirCatalog } from "./quranpedia-tafsir-catalog";
import { createQuranpediaTafsirIndex } from "./quranpedia-tafsir-index";
import { createQuranpediaTafsirLoader } from "./quranpedia-tafsir-loader";
import { parseQuranpediaTafsirHtml } from "./quranpedia-tafsir-html";

const ROOT_PATH = "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw";

describe("Quranpedia real Tafsir archives", () => {
  const reader = createJsonGzipReader();
  const loader = createQuranpediaTafsirLoader(reader);
  const catalog = createQuranpediaTafsirCatalog();

  it("loads Al-Muyassar and preserves its expected metadata and count", async () => {
    const meta = catalog.getBySourceBookId("quranpedia", 2012)!;
    const document = await loader.read(`${ROOT_PATH}/${meta.fileName}`, meta.sourceBookId);
    expect(document.ayahs).toHaveLength(6236);
    expect(document.book.name).toBe("التفسير الميسر");
    expect(document.ayahs[0]?.content[0]?.text).not.toContain("<span");
    expect(createQuranpediaTafsirIndex(meta.id, document).lookup(1, 1).status).toBe("found");
  });

  it("loads Jalalayn, preserves multi-block entries, and reports missing verses", async () => {
    const meta = catalog.getBySourceBookId("quranpedia", 272)!;
    const document = await loader.read(`${ROOT_PATH}/${meta.fileName}`, meta.sourceBookId);
    const index = createQuranpediaTafsirIndex(meta.id, document);

    expect(document.ayahs).toHaveLength(6224);
    expect(index.lookup(1, 1).status).toBe("missing");
    expect(index.lookup(54, 40).status).toBe("missing");

    const multiBlock = document.ayahs.find((entry) => entry.content.length > 1);
    expect(multiBlock).toBeDefined();
    expect(multiBlock!.content.length).toBeGreaterThan(1);
    expect(document.ayahs.some((entry) =>
      entry.content.some((block) => typeof block.image === "string"),
    )).toBe(true);
  });

  it("converts real Jalalayn HTML to a safe structured representation", async () => {
    const meta = catalog.getBySourceBookId("quranpedia", 272)!;
    const document = await loader.read(`${ROOT_PATH}/${meta.fileName}`, meta.sourceBookId);
    const htmlBlock = document.ayahs
      .flatMap((entry) => entry.content)
      .find((block) => block.text.includes("<span"));

    expect(htmlBlock).toBeDefined();
    const ast = parseQuranpediaTafsirHtml(htmlBlock!.text);
    expect(ast.length).toBeGreaterThan(0);
    expect(JSON.stringify(ast)).not.toContain("https://");
    expect(JSON.stringify(ast)).not.toContain("onclick");
  });
});

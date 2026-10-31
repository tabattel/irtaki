import type { JsonGzipReader } from "../../reader/json-gzip-reader";
import type {
  QuranpediaTafsirAyah,
  QuranpediaTafsirContentBlock,
  QuranpediaTafsirDocument,
  QuranpediaTafsirLoader,
} from "./quranpedia-tafsir-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDocument(value: unknown, expectedBookId?: number): QuranpediaTafsirDocument {
  if (!isRecord(value)) {
    throw new Error("Invalid Quranpedia Tafsir document: root must be an object");
  }
  if (!("license" in value) || !isRecord(value.book) || typeof value.schema !== "string") {
    throw new Error("Invalid Quranpedia Tafsir document: missing license, book, or schema");
  }
  const book = value.book;
  if (!Number.isInteger(book.id) || typeof book.name !== "string") {
    throw new Error("Invalid Quranpedia Tafsir document: invalid book metadata");
  }
  if (expectedBookId !== undefined && book.id !== expectedBookId) {
    throw new Error(`Tafsir book ID mismatch: expected ${expectedBookId}, got ${String(book.id)}`);
  }
  if (!Array.isArray(value.ayahs)) {
    throw new Error("Invalid Quranpedia Tafsir document: ayahs must be an array");
  }

  const seen = new Set<string>();
  const ayahs: QuranpediaTafsirAyah[] = value.ayahs.map((rawAyah, index) => {
    if (!isRecord(rawAyah)) {
      throw new Error(`Invalid Tafsir ayah at index ${index}: expected object`);
    }
    const { surah, ayah, content } = rawAyah;
    if (
      !Number.isInteger(surah) || (surah as number) < 1 || (surah as number) > 114 ||
      !Number.isInteger(ayah) || (ayah as number) < 1
    ) {
      throw new Error(`Invalid Tafsir coordinates at index ${index}`);
    }
    const key = `${surah}:${ayah}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate Tafsir coordinates: ${key}`);
    }
    seen.add(key);
    if (!Array.isArray(content) || content.length === 0) {
      throw new Error(`Tafsir ${key} must contain at least one content block`);
    }

    const blocks: QuranpediaTafsirContentBlock[] = content.map((rawBlock, blockIndex) => {
      if (!isRecord(rawBlock) || typeof rawBlock.text !== "string") {
        throw new Error(`Invalid Tafsir content block ${blockIndex} at ${key}`);
      }
      if (
        rawBlock.page !== undefined && rawBlock.page !== null &&
        (!Number.isInteger(rawBlock.page) || (rawBlock.page as number) < 1)
      ) {
        throw new Error(`Invalid page in Tafsir content block ${blockIndex} at ${key}`);
      }
      if (
        rawBlock.image !== undefined && rawBlock.image !== null &&
        typeof rawBlock.image !== "string"
      ) {
        throw new Error(`Invalid image metadata in Tafsir content block ${blockIndex} at ${key}`);
      }
      return { ...rawBlock, text: rawBlock.text } as QuranpediaTafsirContentBlock;
    });

    return { surah: surah as number, ayah: ayah as number, content: blocks };
  });

  return {
    license: value.license,
    book: book as QuranpediaTafsirDocument["book"],
    schema: value.schema,
    ayahs,
  };
}

export function createQuranpediaTafsirLoader(
  reader: JsonGzipReader,
): QuranpediaTafsirLoader {
  return {
    async read(filePath, expectedBookId) {
      const raw = await reader.read<unknown>(filePath);
      return validateDocument(raw, expectedBookId);
    },
  };
}

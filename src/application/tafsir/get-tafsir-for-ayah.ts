import { join } from "node:path";

import { getAyahById } from "@/application/ayah/get-ayah-by-id";
import {
  createJsonGzipReader,
  createQuranpediaTafsirCatalog,
  createQuranpediaTafsirIndex,
  createQuranpediaTafsirLoader,
  parseQuranpediaTafsirHtml,
  type QuranpediaTafsirIndex,
} from "@irtaki/resource";

const DEFAULT_RAW_ROOT =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw";

const DEFAULT_TAFSIR_BOOK_ID = "quranpedia-tafsir-muyassar";

const catalog = createQuranpediaTafsirCatalog();
const loader = createQuranpediaTafsirLoader(createJsonGzipReader());

const indexCache = new Map<string, Promise<QuranpediaTafsirIndex>>();

export interface TafsirBookSummary {
  readonly id: string;
  readonly name: string;
  readonly author: string | null;
  readonly edition: string | null;
  readonly publisher: string | null;
  readonly year: string | null;
  readonly language: string;
  readonly dataVersion: string;
}

export interface TafsirAyahSummary {
  readonly id: number;
  readonly surahNumber: number;
  readonly number: number;
}

export type TafsirForAyahResult =
  | { readonly status: "ayah-not-found" }
  | { readonly status: "book-not-found" }
  | {
      readonly status: "missing";
      readonly ayah: TafsirAyahSummary;
      readonly book: TafsirBookSummary;
      readonly content: readonly [];
    }
  | {
      readonly status: "found";
      readonly ayah: TafsirAyahSummary;
      readonly book: TafsirBookSummary;
      readonly content: readonly {
        readonly part: string | number | null;
        readonly page: number | null;
        readonly ayahs: string | number | null;
        readonly nodes: ReturnType<typeof parseQuranpediaTafsirHtml>;
      }[];
    };

function getRawRoot(): string {
  const configured = process.env.QURANPEDIA_RAW_ROOT?.trim();
  return configured || DEFAULT_RAW_ROOT;
}

async function getBookIndex(
  bookId: string,
  fileName: string,
  sourceBookId: number,
  expectedAyahCount: number | null,
): Promise<QuranpediaTafsirIndex> {
  const rawRoot = getRawRoot();
  const cacheKey = `${rawRoot}:${bookId}`;

  const cached = indexCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = (async () => {
    const document = await loader.read(
      join(rawRoot, fileName),
      sourceBookId,
    );

    const expectedSchema =
      `/v1/ayah/{surah}/{ayah}/book/${sourceBookId}`;

    if (document.schema !== expectedSchema) {
      throw new Error(
        `Unexpected Tafsir schema for ${bookId}: ${document.schema}`,
      );
    }

    if (
      expectedAyahCount !== null &&
      document.ayahs.length !== expectedAyahCount
    ) {
      throw new Error(
        `Unexpected Tafsir ayah count for ${bookId}: ` +
          `${document.ayahs.length}, expected ${expectedAyahCount}`,
      );
    }

    return createQuranpediaTafsirIndex(bookId, document);
  })();

  indexCache.set(cacheKey, pending);

  void pending.catch(() => {
    if (indexCache.get(cacheKey) === pending) {
      indexCache.delete(cacheKey);
    }
  });

  return pending;
}

export async function getTafsirForAyah(
  ayahId: number,
  bookId: string = DEFAULT_TAFSIR_BOOK_ID,
): Promise<TafsirForAyahResult> {
  const ayah = await getAyahById(ayahId);

  if (!ayah) {
    return { status: "ayah-not-found" };
  }

  const book = catalog.getById(bookId);

  if (
    !book ||
    book.category !== "v1" ||
    book.localAvailability !== "available" ||
    !book.fileName
  ) {
    return { status: "book-not-found" };
  }

  const index = await getBookIndex(
    book.id,
    book.fileName,
    book.sourceBookId,
    book.expectedAyahCount,
  );

  const ayahSummary: TafsirAyahSummary = {
    id: ayah.id,
    surahNumber: ayah.surahNumber,
    number: ayah.number,
  };

  const bookSummary: TafsirBookSummary = {
    id: book.id,
    name: book.name,
    author: book.author,
    edition: book.edition,
    publisher: book.publisher,
    year: book.year,
    language: book.language,
    dataVersion: book.dataVersion,
  };

  const lookup = index.lookup(ayah.surahNumber, ayah.number);

  if (lookup.status === "missing") {
    return {
      status: "missing",
      ayah: ayahSummary,
      book: bookSummary,
      content: [],
    };
  }

  return {
    status: "found",
    ayah: ayahSummary,
    book: bookSummary,
    content: lookup.entry.content.map((block) => ({
      part: block.part ?? null,
      page: block.page ?? null,
      ayahs: block.ayahs ?? null,
      nodes: parseQuranpediaTafsirHtml(block.text),
    })),
  };
}

import type { QuranpediaTafsirCatalogEntry } from "./quranpedia-tafsir-types";

const V1_BOOKS: readonly QuranpediaTafsirCatalogEntry[] = [
  {
    id: "quranpedia-tafsir-muyassar",
    source: "quranpedia",
    sourceBookId: 2012,
    name: "التفسير الميسر",
    category: "v1",
    author: "مجمع الملك فهد لطباعة المصحف الشريف",
    edition: null,
    publisher: null,
    year: null,
    language: "ar",
    dataVersion: "2026-08-10",
    format: "json-gzip",
    fileName: "tafsir-book-2012.json.gz",
    sha256: "54357a3c6c3650d1bdecdf99587c91c41f19370dc61be73255e38da632a494df",
    expectedAyahCount: 6236,
    localAvailability: "available",
    licenseVersion: "2026-08-10",
  },
  {
    id: "quranpedia-tafsir-jalalayn",
    source: "quranpedia",
    sourceBookId: 272,
    name: "تفسير الجلالين",
    category: "v1",
    author: "المحلّي",
    edition: "الأولى",
    publisher: "دار الحديث - القاهرة",
    year: "1422 - 2001",
    language: "ar",
    dataVersion: "2026-08-10",
    format: "json-gzip",
    fileName: "tafsir-book-272.json.gz",
    sha256: "20be5cc194f0a53d3d7f48d51a21541a6fe68b36b299936876183f4f017af3e4",
    expectedAyahCount: 6224,
    localAvailability: "available",
    licenseVersion: "2026-08-10",
  },
];

export interface QuranpediaTafsirCatalog {
  readonly entries: readonly QuranpediaTafsirCatalogEntry[];
  getById(id: string): QuranpediaTafsirCatalogEntry | undefined;
  getBySourceBookId(source: string, sourceBookId: number): QuranpediaTafsirCatalogEntry | undefined;
  getByCategory(category: "v1" | "autres"): readonly QuranpediaTafsirCatalogEntry[];
}

export function createQuranpediaTafsirCatalog(
  additionalEntries: readonly QuranpediaTafsirCatalogEntry[] = [],
): QuranpediaTafsirCatalog {
  const entries = [...V1_BOOKS, ...additionalEntries];
  const ids = new Set<string>();
  const sourceKeys = new Set<string>();

  for (const entry of entries) {
    if (!entry.id.trim() || !entry.name.trim()) {
      throw new Error("Tafsir catalog entries require a non-empty id and name");
    }
    if (!Number.isInteger(entry.sourceBookId) || entry.sourceBookId < 0) {
      throw new Error(`Invalid sourceBookId for Tafsir entry "${entry.id}"`);
    }
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate Tafsir catalog id: ${entry.id}`);
    }
    const sourceKey = `${entry.source}:${entry.sourceBookId}`;
    if (sourceKeys.has(sourceKey)) {
      throw new Error(`Duplicate Tafsir source reference: ${sourceKey}`);
    }
    ids.add(entry.id);
    sourceKeys.add(sourceKey);
  }

  const frozenEntries = Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));

  return {
    entries: frozenEntries,
    getById(id) {
      return frozenEntries.find((entry) => entry.id === id);
    },
    getBySourceBookId(source, sourceBookId) {
      return frozenEntries.find(
        (entry) => entry.source === source && entry.sourceBookId === sourceBookId,
      );
    },
    getByCategory(category) {
      return frozenEntries.filter((entry) => entry.category === category);
    },
  };
}

export const QURANPEDIA_TAFSIR_OTHER_CATEGORY_LABEL = "Autres";

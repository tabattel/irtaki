import type {
  QuranpediaTafsirAyah,
  QuranpediaTafsirDocument,
  QuranpediaTafsirLookup,
} from "./quranpedia-tafsir-types";

export interface QuranpediaTafsirIndex {
  readonly bookId: string;
  readonly size: number;
  lookup(surah: number, ayah: number): QuranpediaTafsirLookup;
  has(surah: number, ayah: number): boolean;
}

export function createQuranpediaTafsirIndex(
  bookId: string,
  document: QuranpediaTafsirDocument,
): QuranpediaTafsirIndex {
  if (!bookId.trim()) {
    throw new Error("Tafsir index requires a non-empty catalog book ID");
  }

  const entries = new Map<string, QuranpediaTafsirAyah>();
  for (const entry of document.ayahs) {
    const key = `${entry.surah}:${entry.ayah}`;
    if (entries.has(key)) {
      throw new Error(`Duplicate Tafsir coordinates: ${key}`);
    }
    entries.set(key, entry);
  }

  function validCoordinates(surah: number, ayah: number): boolean {
    return Number.isInteger(surah) && surah >= 1 && surah <= 114 &&
      Number.isInteger(ayah) && ayah >= 1;
  }

  return {
    bookId,
    size: entries.size,
    lookup(surah, ayah) {
      if (!validCoordinates(surah, ayah)) {
        throw new RangeError(`Invalid Tafsir coordinates: ${surah}:${ayah}`);
      }
      const entry = entries.get(`${surah}:${ayah}`);
      return entry
        ? { status: "found", bookId, surah, ayah, entry }
        : { status: "missing", bookId, surah, ayah };
    },
    has(surah, ayah) {
      if (!validCoordinates(surah, ayah)) {
        return false;
      }
      return entries.has(`${surah}:${ayah}`);
    },
  };
}

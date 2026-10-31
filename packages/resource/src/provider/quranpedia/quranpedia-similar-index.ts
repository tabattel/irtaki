import type {
  QuranpediaSimilarDocument,
  QuranpediaSimilarEntry,
  QuranpediaSimilarLookup,
} from "./quranpedia-similar-types";

export interface QuranpediaSimilarIndex {
  readonly size: number;
  readonly dataVersion: string;
  lookup(surah: number, ayah: number): QuranpediaSimilarLookup;
  has(surah: number, ayah: number): boolean;
}

function validCoordinates(surah: number, ayah: number): boolean {
  return (
    Number.isInteger(surah) &&
    surah >= 1 &&
    surah <= 114 &&
    Number.isInteger(ayah) &&
    ayah >= 1
  );
}

export function createQuranpediaSimilarIndex(
  document: QuranpediaSimilarDocument,
): QuranpediaSimilarIndex {
  const entries = new Map<string, QuranpediaSimilarEntry>();

  for (const entry of document.data) {
    const key = `${entry.surah}:${entry.ayah}`;

    if (entries.has(key)) {
      throw new Error(`Duplicate Quranpedia similar coordinates: ${key}`);
    }

    entries.set(key, entry);
  }

  return {
    size: entries.size,
    dataVersion: document.license.version,

    lookup(surah, ayah) {
      if (!validCoordinates(surah, ayah)) {
        throw new RangeError(
          `Invalid Quranpedia similar coordinates: ${surah}:${ayah}`,
        );
      }

      const entry = entries.get(`${surah}:${ayah}`);

      return entry
        ? { status: "found", surah, ayah, entry }
        : { status: "missing", surah, ayah };
    },

    has(surah, ayah) {
      return (
        validCoordinates(surah, ayah) &&
        entries.has(`${surah}:${ayah}`)
      );
    },
  };
}

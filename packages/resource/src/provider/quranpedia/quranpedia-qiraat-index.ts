import type {
  QuranpediaQiraatAyah,
  QuranpediaQiraatDocument,
} from "./quranpedia-qiraat";

const EXPECTED_SCHEMA = "/v1/ayah/{surah}/{ayah}/qiraat";

export type QuranpediaQiraatLookup =
  | {
      readonly status: "found";
      readonly surah: number;
      readonly ayah: number;
      readonly entry: QuranpediaQiraatAyah;
    }
  | {
      readonly status: "missing";
      readonly surah: number;
      readonly ayah: number;
    };

export interface QuranpediaQiraatIndex {
  readonly size: number;
  readonly dataVersion: string;
  lookup(surah: number, ayah: number): QuranpediaQiraatLookup;
  has(surah: number, ayah: number): boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
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

function validateDocument(value: unknown): {
  readonly data: readonly QuranpediaQiraatAyah[];
  readonly dataVersion: string;
} {
  if (
    !isRecord(value) ||
    value.schema !== EXPECTED_SCHEMA ||
    !isRecord(value.license) ||
    typeof value.license.version !== "string" ||
    !Array.isArray(value.data)
  ) {
    throw new Error("Invalid Quranpedia Qiraat document or schema");
  }

  const seenCoordinates = new Set<string>();
  const rawiQiraaIds = new Map<number, number>();
  const entries: QuranpediaQiraatAyah[] = [];

  for (const [entryIndex, rawEntry] of value.data.entries()) {
    if (
      !isRecord(rawEntry) ||
      !isPositiveInteger(rawEntry.surah) ||
      rawEntry.surah > 114 ||
      !isPositiveInteger(rawEntry.ayah) ||
      !Array.isArray(rawEntry.qiraat)
    ) {
      throw new Error(
        `Invalid Quranpedia Qiraat ayah at data[${entryIndex}]`,
      );
    }

    const surah = rawEntry.surah;
    const ayah = rawEntry.ayah;
    const coordinate = `${surah}:${ayah}`;

    if (seenCoordinates.has(coordinate)) {
      throw new Error(
        `Duplicate Quranpedia Qiraat coordinates: ${coordinate}`,
      );
    }

    seenCoordinates.add(coordinate);

    for (const [wordIndex, rawWord] of rawEntry.qiraat.entries()) {
      const wordLocation = `${coordinate}.qiraat[${wordIndex}]`;

      if (
        !isRecord(rawWord) ||
        typeof rawWord.ayah_word !== "string" ||
        !Array.isArray(rawWord.qiraat)
      ) {
        throw new Error(`Invalid Quranpedia Qiraat word at ${wordLocation}`);
      }

      for (const [readingIndex, rawReading] of rawWord.qiraat.entries()) {
        const readingLocation =
          `${wordLocation}.qiraat[${readingIndex}]`;

        if (
          !isRecord(rawReading) ||
          typeof rawReading.qiraa_text !== "string" ||
          !Array.isArray(rawReading.rewayat)
        ) {
          throw new Error(
            `Invalid Quranpedia Qiraat reading at ${readingLocation}`,
          );
        }

        for (const [rewayaIndex, rawRewaya] of rawReading.rewayat.entries()) {
          const rewayaLocation =
            `${readingLocation}.rewayat[${rewayaIndex}]`;

          if (
            !isRecord(rawRewaya) ||
            (rawRewaya.audio !== null &&
              typeof rawRewaya.audio !== "string") ||
            !isRecord(rawRewaya.rawi)
          ) {
            throw new Error(
              `Invalid Quranpedia Qiraat rawi association at ${rewayaLocation}`,
            );
          }

          const rawi = rawRewaya.rawi;

          if (
            !isPositiveInteger(rawi.id) ||
            typeof rawi.name !== "string" ||
            typeof rawi.full_name !== "string" ||
            !isRecord(rawi.qiraa)
          ) {
            throw new Error(
              `Invalid Quranpedia rawi at ${rewayaLocation}`,
            );
          }

          const qiraa = rawi.qiraa;

          if (
            !isPositiveInteger(qiraa.id) ||
            typeof qiraa.short_name !== "string" ||
            typeof qiraa.full_name !== "string"
          ) {
            throw new Error(
              `Invalid Quranpedia qiraa association at ${rewayaLocation}`,
            );
          }

          const previousQiraaId = rawiQiraaIds.get(rawi.id);

          if (
            previousQiraaId !== undefined &&
            previousQiraaId !== qiraa.id
          ) {
            throw new Error(
              `Inconsistent Quranpedia rawi association: rawi ${rawi.id}`,
            );
          }

          rawiQiraaIds.set(rawi.id, qiraa.id);
        }
      }
    }

    entries.push(rawEntry as unknown as QuranpediaQiraatAyah);
  }

  return {
    data: entries,
    dataVersion: value.license.version,
  };
}

export function createQuranpediaQiraatIndex(
  document: QuranpediaQiraatDocument,
): QuranpediaQiraatIndex {
  const validated = validateDocument(document);
  const entries = new Map<string, QuranpediaQiraatAyah>();

  for (const entry of validated.data) {
    entries.set(`${entry.surah}:${entry.ayah}`, entry);
  }

  return {
    size: entries.size,
    dataVersion: validated.dataVersion,

    lookup(surah, ayah) {
      if (!validCoordinates(surah, ayah)) {
        throw new RangeError(
          `Invalid Quranpedia Qiraat coordinates: ${surah}:${ayah}`,
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

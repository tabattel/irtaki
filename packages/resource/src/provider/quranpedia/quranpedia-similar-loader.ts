import type { JsonGzipReader } from "../../reader/json-gzip-reader";
import type {
  QuranpediaSimilarAttachment,
  QuranpediaSimilarDocument,
  QuranpediaSimilarLoader,
} from "./quranpedia-similar-types";

const EXPECTED_SCHEMA = "/v1/ayah/{surah}/{ayah}/similar";

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function validateAttachment(
  value: unknown,
  location: string,
): value is QuranpediaSimilarAttachment {
  if (
    !isRecord(value) ||
    !isPositiveInteger(value.id) ||
    typeof value.file_name !== "string"
  ) {
    throw new Error(`Invalid Quranpedia attachment at ${location}`);
  }

  if (
    value.name !== undefined &&
    value.name !== null &&
    typeof value.name !== "string"
  ) {
    throw new Error(`Invalid attachment name at ${location}`);
  }

  return true;
}

function validateAttachmentCollection(
  value: unknown,
  location: string,
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      validateAttachment(item, `${location}[${index}]`);
    });
    return;
  }

  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      validateAttachment(item, `${location}.${key}`);
    }
    return;
  }

  throw new Error(`Invalid Quranpedia attachment collection at ${location}`);
}

function validateReference(value: unknown, location: string): void {
  if (!isRecord(value) || !isRecord(value.info)) {
    throw new Error(`Invalid Quranpedia ayah reference at ${location}`);
  }

  const info = value.info;

  if (
    !isPositiveInteger(info.id) ||
    !isPositiveInteger(info.number) ||
    typeof info.text !== "string" ||
    !isPositiveInteger(info.surah_id) ||
    !isRecord(info.surah) ||
    !isPositiveInteger(info.surah.id) ||
    typeof info.surah.name !== "string"
  ) {
    throw new Error(`Invalid Quranpedia ayah information at ${location}`);
  }

  if (typeof value.text !== "string") {
    throw new Error(`Invalid Quranpedia ayah display text at ${location}`);
  }

  if (
    !Array.isArray(value.ayah_ids) ||
    !value.ayah_ids.every(isPositiveInteger)
  ) {
    throw new Error(`Invalid Quranpedia ayah IDs at ${location}`);
  }
}

function validateGroup(value: unknown, location: string): void {
  if (
    !isRecord(value) ||
    typeof value.notes !== "string" ||
    !Array.isArray(value.images) ||
    !Array.isArray(value.ayahs) ||
    !Array.isArray(value.websites)
  ) {
    throw new Error(`Invalid Quranpedia similar group at ${location}`);
  }

  value.images.forEach((item, index) => {
    validateAttachment(item, `${location}.images[${index}]`);
  });

  validateAttachmentCollection(value.youtube, `${location}.youtube`);

  value.ayahs.forEach((reference, index) => {
    validateReference(reference, `${location}.ayahs[${index}]`);
  });
}

function validateDocument(value: unknown): QuranpediaSimilarDocument {
  if (
    !isRecord(value) ||
    !isRecord(value.license) ||
    typeof value.license.version !== "string" ||
    value.schema !== EXPECTED_SCHEMA ||
    !Array.isArray(value.data)
  ) {
    throw new Error("Invalid Quranpedia Similar document or schema");
  }

  const seen = new Set<string>();

  value.data.forEach((entry, index) => {
    if (
      !isRecord(entry) ||
      !isPositiveInteger(entry.surah) ||
      entry.surah > 114 ||
      !isPositiveInteger(entry.ayah) ||
      !Array.isArray(entry.similar)
    ) {
      throw new Error(`Invalid Quranpedia source entry at index ${index}`);
    }

    const key = `${entry.surah}:${entry.ayah}`;

    if (seen.has(key)) {
      throw new Error(`Duplicate Quranpedia similar coordinates: ${key}`);
    }

    seen.add(key);

    entry.similar.forEach((group, groupIndex) => {
      validateGroup(group, `${key}.similar[${groupIndex}]`);
    });
  });

  // Retourne le document original : aucune normalisation ni perte de champs.
  return value as unknown as QuranpediaSimilarDocument;
}

export function createQuranpediaSimilarLoader(
  reader: JsonGzipReader,
): QuranpediaSimilarLoader {
  return {
    async read(filePath) {
      const raw = await reader.read<unknown>(filePath);
      return validateDocument(raw);
    },
  };
}

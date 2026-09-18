import type { JsonGzipReader } from "../../reader/json-gzip-reader";

export interface QuranpediaSurahIndexRecord {
  readonly id: number;
  readonly name: string;
  readonly coded_name: string;
  readonly translated_name: string;
  readonly number_of_ayahs: number;
  readonly first_page: number;
  readonly last_page: number;
  readonly first_juz: number;
  readonly revelation_type: string;
  readonly revelation_order: number;
}

export interface QuranpediaSurahsIndexDocument {
  readonly license: unknown;
  readonly schema: string;
  readonly data: readonly QuranpediaSurahIndexRecord[];
}

export interface QuranpediaSurahsIndexLoader {
  read(filePath: string): Promise<QuranpediaSurahsIndexDocument>;
}

export function createQuranpediaSurahsIndexLoader(
  reader: JsonGzipReader,
): QuranpediaSurahsIndexLoader {
  return {
    read(filePath) {
      return reader.read<QuranpediaSurahsIndexDocument>(filePath);
    },
  };
}

import type { JsonGzipReader } from "../../reader/json-gzip-reader";

export interface QuranpediaQiraa {
  readonly id: number;
  readonly short_name: string;
  readonly full_name: string;
}

export interface QuranpediaRawi {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly qiraa: QuranpediaQiraa;
}

export interface QuranpediaRewaya {
  readonly rawi: QuranpediaRawi;
  readonly audio: string;
}

export interface QuranpediaQiraatReading {
  readonly qiraa_text: string;
  readonly rewayat: readonly QuranpediaRewaya[];
}

export interface QuranpediaQiraatWord {
  readonly ayah_word: string;
  readonly qiraat: readonly QuranpediaQiraatReading[];
}

export interface QuranpediaQiraatAyah {
  readonly surah: number;
  readonly ayah: number;
  readonly qiraat: readonly QuranpediaQiraatWord[];
}

export interface QuranpediaQiraatDocument {
  readonly license: unknown;
  readonly schema: string;
  readonly data: readonly QuranpediaQiraatAyah[];
}

export interface QuranpediaQiraatLoader {
  read(filePath: string): Promise<QuranpediaQiraatDocument>;
}

export function createQuranpediaQiraatLoader(
  reader: JsonGzipReader,
): QuranpediaQiraatLoader {
  return {
    read(filePath) {
      return reader.read<QuranpediaQiraatDocument>(filePath);
    },
  };
}

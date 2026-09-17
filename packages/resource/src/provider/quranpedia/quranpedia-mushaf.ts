import type { JsonGzipReader } from "../../reader/json-gzip-reader";

export interface QuranpediaMushafQiraa {
  readonly id: number;
  readonly name: string | null;
  readonly count: {
    readonly id: number;
    readonly name: string;
  };
}

export interface QuranpediaMushafRawi {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly qiraa: QuranpediaMushafQiraa;
}

export interface QuranpediaMushafAyah {
  readonly id: number;
  readonly number: number;
  readonly surah: string;
  readonly page_number: number;
  readonly text: string;
  readonly marker: string;
  readonly juz: number;
  readonly hizb: number;
  readonly ruku: number;
  readonly manzil: number;
  readonly options: readonly string[];
  readonly number_in_hafs: readonly number[];
}

export interface QuranpediaMushafSurah {
  readonly id: number;
  readonly name: string;
  readonly coded_name: string;
  readonly ayahs: readonly QuranpediaMushafAyah[];
}

export interface QuranpediaMushafRaw {
  readonly id: number;
  readonly name: string;
  readonly description?: string | null;
  readonly image?: string | null;
  readonly bismillah?: string | null;
  readonly font_file?: string | null;
  readonly images?: string | null;
  readonly images_png?: string | null;
  readonly rawi: QuranpediaMushafRawi;
  readonly surahs: readonly QuranpediaMushafSurah[];
}

export interface QuranpediaMushafDocument {
  readonly license: unknown;
  readonly schema: string;
  readonly data: QuranpediaMushafRaw;
}

export interface QuranpediaMushafLoader {
  read(filePath: string): Promise<QuranpediaMushafDocument>;
}

export function createQuranpediaMushafLoader(
  reader: JsonGzipReader,
): QuranpediaMushafLoader {
  return {
    read(filePath) {
      return reader.read<QuranpediaMushafDocument>(filePath);
    },
  };
}

import type { JsonGzipReader } from "../../reader/json-gzip-reader";

export interface QuranpediaSurahInformationField {
  readonly title: string;
  readonly value: string | null;
}

export interface QuranpediaAyahCount {
  readonly title: string;
  readonly value: number;
}

export interface QuranpediaSurahInformation {
  readonly introduction: QuranpediaSurahInformationField;
  readonly surah_number: QuranpediaSurahInformationField;
  readonly surah_type: QuranpediaSurahInformationField;
  readonly words_count: QuranpediaSurahInformationField;
  readonly descent: QuranpediaSurahInformationField;
  readonly grace: QuranpediaSurahInformationField;
  readonly prophet: QuranpediaSurahInformationField;
  readonly revelation: QuranpediaSurahInformationField;
  readonly topics: QuranpediaSurahInformationField;
  readonly purposes: QuranpediaSurahInformationField;
  readonly asmaoha: QuranpediaSurahInformationField;
  readonly ayahs_count: readonly QuranpediaAyahCount[];
}

export interface QuranpediaSurahInformationEntry {
  readonly surah: number;
  readonly information: QuranpediaSurahInformation;
}

export interface QuranpediaSurahsDocument {
  readonly license: unknown;
  readonly schema: string;
  readonly data: readonly QuranpediaSurahInformationEntry[];
}

export interface QuranpediaSurahsLoader {
  read(filePath: string): Promise<QuranpediaSurahsDocument>;
}

export function createQuranpediaSurahsLoader(
  reader: JsonGzipReader,
): QuranpediaSurahsLoader {
  return {
    read(filePath) {
      return reader.read<QuranpediaSurahsDocument>(filePath);
    },
  };
}

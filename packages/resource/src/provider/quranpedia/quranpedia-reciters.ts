import type { JsonGzipReader } from "../../reader/json-gzip-reader";

export interface QuranpediaReciterRawi {
  readonly id: number;
  readonly name: string;
}

export interface QuranpediaRecitationType {
  readonly id: number;
  readonly ar_name: string;
}

export interface QuranpediaRecitationClassification {
  readonly id: number;
  readonly name: string;
}

export interface QuranpediaReciter {
  readonly id: number;
  readonly name: string;
  readonly surahs_list: readonly number[];
  readonly timing_url: string | null;
  readonly server: string;
  readonly rawi: QuranpediaReciterRawi;
  readonly recitation_type: QuranpediaRecitationType;
  readonly classification: QuranpediaRecitationClassification;
}

export type QuranpediaReciterGroup = readonly QuranpediaReciter[];

export interface QuranpediaRecitersDocument {
  readonly license: unknown;
  readonly schema: string;
  readonly data: readonly QuranpediaReciterGroup[];
}

export interface QuranpediaRecitersLoader {
  read(filePath: string): Promise<QuranpediaRecitersDocument>;
}

export function createQuranpediaRecitersLoader(
  reader: JsonGzipReader,
): QuranpediaRecitersLoader {
  return {
    read(filePath) {
      return reader.read<QuranpediaRecitersDocument>(filePath);
    },
  };
}

import type { JsonGzipReader } from "../../reader/json-gzip-reader";

export interface QuranpediaMushafIndexRecord {
  readonly id: number;
  readonly name: string;
  readonly rawi: {
    readonly id: number;
    readonly name: string;
    readonly full_name: string;
    readonly qiraa: {
      readonly id: number;
      readonly short_name: string;
      readonly full_name: string;
    };
  };
}

export interface QuranpediaMushafsIndex {
  readonly license: unknown;
  readonly schema: string;
  readonly data: readonly QuranpediaMushafIndexRecord[];
}

export interface QuranpediaMushafsIndexLoader {
  read(filePath: string): Promise<QuranpediaMushafsIndex>;
}

export function createQuranpediaMushafsIndexLoader(
  reader: JsonGzipReader,
): QuranpediaMushafsIndexLoader {
  return {
    read(filePath) {
      return reader.read<QuranpediaMushafsIndex>(filePath);
    },
  };
}

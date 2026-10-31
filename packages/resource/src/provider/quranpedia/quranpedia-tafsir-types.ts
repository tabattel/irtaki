export type TafsirBookCategory = "v1" | "autres";

export interface TafsirAuthor {
  readonly id?: number | null;
  readonly ar_name?: string | null;
  readonly full_name?: string | null;
}

export interface TafsirLanguage {
  readonly id?: number;
  readonly name?: string;
  readonly code?: string;
  readonly direction?: string;
}

export interface QuranpediaTafsirBookMetadata {
  readonly id: number;
  readonly name: string;
  readonly short_name?: string;
  readonly parts?: string | number | null;
  readonly publish_year?: string | number | null;
  readonly edition?: string | null;
  readonly nasher?: string | null;
  readonly author?: TafsirAuthor | null;
  readonly language?: TafsirLanguage | null;
  readonly [key: string]: unknown;
}

export interface QuranpediaTafsirCatalogEntry {
  readonly id: string;
  readonly source: "quranpedia" | (string & {});
  readonly sourceBookId: number;
  readonly name: string;
  readonly category: TafsirBookCategory;
  readonly author: string | null;
  readonly edition: string | null;
  readonly publisher: string | null;
  readonly year: string | null;
  readonly language: string;
  readonly dataVersion: string;
  readonly format: "json-gzip" | (string & {});
  readonly fileName: string | null;
  readonly sha256: string | null;
  readonly expectedAyahCount: number | null;
  readonly localAvailability: "available" | "planned";
  readonly licenseVersion: string | null;
}

export interface QuranpediaTafsirContentBlock {
  readonly text: string;
  readonly part?: string | number | null;
  readonly page?: number | null;
  readonly ayahs?: string | number | null;
  readonly image?: string | null;
  readonly [key: string]: unknown;
}

export interface QuranpediaTafsirAyah {
  readonly surah: number;
  readonly ayah: number;
  readonly content: readonly QuranpediaTafsirContentBlock[];
}

export interface QuranpediaTafsirDocument {
  readonly license: unknown;
  readonly book: QuranpediaTafsirBookMetadata;
  readonly schema: string;
  readonly ayahs: readonly QuranpediaTafsirAyah[];
}

export interface QuranpediaTafsirLoader {
  read(filePath: string, expectedBookId?: number): Promise<QuranpediaTafsirDocument>;
}

export type QuranpediaTafsirLookup =
  | {
      readonly status: "found";
      readonly bookId: string;
      readonly surah: number;
      readonly ayah: number;
      readonly entry: QuranpediaTafsirAyah;
    }
  | {
      readonly status: "missing";
      readonly bookId: string;
      readonly surah: number;
      readonly ayah: number;
    };

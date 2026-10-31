export interface QuranpediaSimilarAttachment {
  readonly id: number;
  readonly name?: string | null;
  readonly file_name: string;
  readonly [key: string]: unknown;
}

export type QuranpediaSimilarYoutube =
  | readonly QuranpediaSimilarAttachment[]
  | Readonly<Record<string, QuranpediaSimilarAttachment>>;

export interface QuranpediaSimilarSurah {
  readonly id: number;
  readonly name: string;
  readonly [key: string]: unknown;
}

export interface QuranpediaSimilarAyahInfo {
  readonly id: number;
  readonly number: number;
  readonly text: string;
  readonly surah_id: number;
  readonly surah: QuranpediaSimilarSurah;
  readonly page_number?: number | null;
  readonly juz?: number | null;
  readonly hizb?: number | null;
  readonly marker?: string | null;
  readonly [key: string]: unknown;
}

export interface QuranpediaSimilarAyahReference {
  readonly info: QuranpediaSimilarAyahInfo;
  readonly text: string;
  readonly ayah_ids: readonly number[];
  readonly ayah_to_number: unknown;
  readonly [key: string]: unknown;
}

export interface QuranpediaSimilarGroup {
  readonly notes: string;
  readonly images: readonly QuranpediaSimilarAttachment[];
  readonly youtube: QuranpediaSimilarYoutube;
  readonly ayahs: readonly QuranpediaSimilarAyahReference[];
  readonly websites: readonly unknown[];
  readonly [key: string]: unknown;
}

export interface QuranpediaSimilarEntry {
  readonly surah: number;
  readonly ayah: number;
  readonly similar: readonly QuranpediaSimilarGroup[];
  readonly [key: string]: unknown;
}

export interface QuranpediaSimilarDocument {
  readonly license: {
    readonly version: string;
    readonly [key: string]: unknown;
  };
  readonly schema: string;
  readonly data: readonly QuranpediaSimilarEntry[];
}

export interface QuranpediaSimilarLoader {
  read(filePath: string): Promise<QuranpediaSimilarDocument>;
}

export type QuranpediaSimilarLookup =
  | {
      readonly status: "found";
      readonly surah: number;
      readonly ayah: number;
      readonly entry: QuranpediaSimilarEntry;
    }
  | {
      readonly status: "missing";
      readonly surah: number;
      readonly ayah: number;
    };

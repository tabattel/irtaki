import type { SafeTafsirNode } from "@irtaki/resource";
import { apiGet } from "./client";

export type TafsirBookId =
  | "quranpedia-tafsir-muyassar"
  | "quranpedia-tafsir-jalalayn";

export interface TafsirAyahDto {
  readonly status: "found" | "missing";
  readonly ayah: {
    readonly id: number;
    readonly surahNumber: number;
    readonly number: number;
  };
  readonly book: {
    readonly id: TafsirBookId;
    readonly name: string;
    readonly author: string | null;
    readonly edition: string | null;
    readonly publisher: string | null;
    readonly year: string | null;
    readonly language: string;
    readonly dataVersion: string;
  };
  readonly content: readonly {
    readonly part: string | number | null;
    readonly page: number | null;
    readonly ayahs: string | number | null;
    readonly nodes: readonly SafeTafsirNode[];
  }[];
}

interface TafsirApiResponse {
  readonly data: TafsirAyahDto;
}

export async function getTafsirForAyah(
  ayahId: number,
  bookId: TafsirBookId,
  signal?: AbortSignal,
): Promise<TafsirAyahDto> {
  const query = new URLSearchParams({ bookId });

  const response = await apiGet<TafsirApiResponse>(
    `/api/tafsir/ayah/${ayahId}?${query.toString()}`,
    { signal },
  );

  return response.data;
}

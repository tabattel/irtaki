import { apiGet } from "./client";

export type MushafLineType = "ayah" | "surah_name" | "basmallah" | string;

export interface MushafLayoutWord {
  id: number;
  key: string;
  surah: number;
  ayah: number;
  word: number;
  text: string;
}

export interface MushafLayoutLine {
  line: number;
  type: MushafLineType;
  centered: boolean;
  surahNumber: number | null;
  words: MushafLayoutWord[];
}

export interface MushafPageLayout {
  mushafId: number;
  page: number;
  lines: MushafLayoutLine[];
}

export async function getMushafPageLayout(
  mushafId: number,
  pageNumber: number,
): Promise<MushafPageLayout> {
  return apiGet<MushafPageLayout>(
    `/api/mushaf/${mushafId}/layout/${pageNumber}`,
  );
}

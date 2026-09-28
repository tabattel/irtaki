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
  page: number;
  lines: MushafLayoutLine[];
}

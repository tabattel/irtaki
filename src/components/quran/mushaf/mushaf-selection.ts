export type MushafContextTarget =
  | {
      type: "word";
      ayahId: number;
      surahNumber: number;
      ayahNumber: number;
      wordKey: string;
      wordNumber: number;
      text: string;
    }
  | {
      type: "ayah";
      ayahId: number;
      surahNumber: number;
      ayahNumber: number;
    };

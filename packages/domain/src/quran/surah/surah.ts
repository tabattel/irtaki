export type SurahRevelationType = "meccan" | "medinan";

export interface SurahProps {
  id: number;
  number: number;
  name: string;
  codedName?: string;
  translatedName?: string;
  numberOfAyahs: number;
  firstPage: number;
  lastPage: number;
  firstJuz: number;
  revelationType: SurahRevelationType;
  revelationOrder: number;
}

export class Surah {
  public readonly id: number;
  public readonly number: number;
  public readonly name: string;
  public readonly codedName?: string;
  public readonly translatedName?: string;
  public readonly numberOfAyahs: number;
  public readonly firstPage: number;
  public readonly lastPage: number;
  public readonly firstJuz: number;
  public readonly revelationType: SurahRevelationType;
  public readonly revelationOrder: number;

  constructor(props: SurahProps) {
    if (!Number.isInteger(props.id) || props.id < 1) {
      throw new Error("Surah ID must be a positive integer.");
    }

    if (
      !Number.isInteger(props.number) ||
      props.number < 1 ||
      props.number > 114
    ) {
      throw new Error("Surah number must be between 1 and 114.");
    }

    if (props.name.trim().length === 0) {
      throw new Error("Surah name cannot be empty.");
    }

    if (!Number.isInteger(props.numberOfAyahs) || props.numberOfAyahs < 1) {
      throw new Error("Surah ayah count must be a positive integer.");
    }

    if (!Number.isInteger(props.firstPage) || props.firstPage < 1) {
      throw new Error("Surah first page must be a positive integer.");
    }

    if (!Number.isInteger(props.lastPage) || props.lastPage < props.firstPage) {
      throw new Error(
        "Surah last page must be greater than or equal to first page.",
      );
    }

    if (!Number.isInteger(props.firstJuz) || props.firstJuz < 1) {
      throw new Error("Surah first juz must be a positive integer.");
    }

    if (!Number.isInteger(props.revelationOrder) || props.revelationOrder < 1) {
      throw new Error("Surah revelation order must be a positive integer.");
    }

    this.id = props.id;
    this.number = props.number;
    this.name = props.name.trim();
    this.codedName = props.codedName?.trim();
    this.translatedName = props.translatedName?.trim();
    this.numberOfAyahs = props.numberOfAyahs;
    this.firstPage = props.firstPage;
    this.lastPage = props.lastPage;
    this.firstJuz = props.firstJuz;
    this.revelationType = props.revelationType;
    this.revelationOrder = props.revelationOrder;
  }
}

export interface AyahProps {
  id: number;
  number: number;
  surahNumber: number;
  text: string;
  pageNumber: number;
  juz: number;
  hizb: number;
  manzil: number;
  ruku: number;
  marker: string;
  numberInHafs: number[];
}

export class Ayah {
  public readonly id: number;
  public readonly number: number;
  public readonly surahNumber: number;
  public readonly text: string;
  public readonly pageNumber: number;
  public readonly juz: number;
  public readonly hizb: number;
  public readonly manzil: number;
  public readonly ruku: number;
  public readonly marker: string;
  public readonly numberInHafs: readonly number[];

  constructor(props: AyahProps) {
    if (!Number.isInteger(props.id) || props.id < 1) {
      throw new Error("Ayah ID must be a positive integer.");
    }

    if (!Number.isInteger(props.number) || props.number < 1) {
      throw new Error("Ayah number must be a positive integer.");
    }

    if (
      !Number.isInteger(props.surahNumber) ||
      props.surahNumber < 1 ||
      props.surahNumber > 114
    ) {
      throw new Error("Ayah surah number must be between 1 and 114.");
    }

    if (props.text.trim().length === 0) {
      throw new Error("Ayah text cannot be empty.");
    }

    if (!Number.isInteger(props.pageNumber) || props.pageNumber < 1) {
      throw new Error("Ayah page number must be a positive integer.");
    }

    if (!Number.isInteger(props.juz) || props.juz < 1) {
      throw new Error("Ayah juz must be a positive integer.");
    }

    if (!Number.isInteger(props.hizb) || props.hizb < 1) {
      throw new Error("Ayah hizb must be a positive integer.");
    }

    if (!Number.isInteger(props.manzil) || props.manzil < 1) {
      throw new Error("Ayah manzil must be a positive integer.");
    }

    if (!Number.isInteger(props.ruku) || props.ruku < 1) {
      throw new Error("Ayah ruku must be a positive integer.");
    }

    if (props.marker.trim().length === 0) {
      throw new Error("Ayah marker cannot be empty.");
    }

    if (
      props.numberInHafs.length === 0 ||
      props.numberInHafs.some((value) => !Number.isInteger(value) || value < 1)
    ) {
      throw new Error("Ayah numberInHafs must contain positive integers.");
    }

    this.id = props.id;
    this.number = props.number;
    this.surahNumber = props.surahNumber;
    this.text = props.text.trim();
    this.pageNumber = props.pageNumber;
    this.juz = props.juz;
    this.hizb = props.hizb;
    this.manzil = props.manzil;
    this.ruku = props.ruku;
    this.marker = props.marker.trim();
    this.numberInHafs = [...props.numberInHafs];
  }
}

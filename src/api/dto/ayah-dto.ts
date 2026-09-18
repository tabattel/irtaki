export type AyahDto = {
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
};

export function toAyahDto(ayah: {
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
}): AyahDto {
  return {
    id: ayah.id,
    number: ayah.number,
    surahNumber: ayah.surahNumber,
    text: ayah.text,
    pageNumber: ayah.pageNumber,
    juz: ayah.juz,
    hizb: ayah.hizb,
    manzil: ayah.manzil,
    ruku: ayah.ruku,
    marker: ayah.marker,
    numberInHafs: ayah.numberInHafs,
  };
}

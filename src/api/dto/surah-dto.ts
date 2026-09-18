export type SurahDto = {
  id: number;
  number: number;
  name: string;
  codedName: string | null;
  translatedName: string | null;
  numberOfAyahs: number;
  firstPage: number;
  lastPage: number;
  firstJuz: number;
  revelationType: string;
  revelationOrder: number;
};

export function toSurahDto(surah: {
  id: number;
  number: number;
  name: string;
  codedName: string | null;
  translatedName: string | null;
  numberOfAyahs: number;
  firstPage: number;
  lastPage: number;
  firstJuz: number;
  revelationType: string;
  revelationOrder: number;
}): SurahDto {
  return {
    id: surah.id,
    number: surah.number,
    name: surah.name,
    codedName: surah.codedName,
    translatedName: surah.translatedName,
    numberOfAyahs: surah.numberOfAyahs,
    firstPage: surah.firstPage,
    lastPage: surah.lastPage,
    firstJuz: surah.firstJuz,
    revelationType: surah.revelationType,
    revelationOrder: surah.revelationOrder,
  };
}

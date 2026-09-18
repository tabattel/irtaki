import { apiGet } from "./client";

export interface SurahDto {
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
}

export interface AyahDto {
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

interface CollectionResponse<T> {
  data: T[];
}

export async function getSurahs(): Promise<SurahDto[]> {
  const response = await apiGet<CollectionResponse<SurahDto>>("/api/surahs");

  return response.data;
}

export async function getAyahsBySurah(surahNumber: number): Promise<AyahDto[]> {
  const response = await apiGet<CollectionResponse<AyahDto>>(
    `/api/surahs/${surahNumber}/ayahs`,
  );

  return response.data;
}

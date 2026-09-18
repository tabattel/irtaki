import { AyahRepository } from "@irtaki/persistence";

export async function getAyahsBySurah(surahNumber: number) {
  const repository = new AyahRepository();

  return repository.findBySurahNumber(surahNumber);
}

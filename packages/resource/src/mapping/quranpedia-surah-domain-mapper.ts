import { Surah } from "@irtaki/domain";

import type { QuranpediaSurahIndexRecord } from "../provider/quranpedia/quranpedia-surahs-index";

function resolveRevelationType(
  revelationType: string,
): "meccan" | "medinan" {
  if (revelationType === "مكية") {
    return "meccan";
  }

  if (revelationType === "مدنية") {
    return "medinan";
  }

  throw new Error(
    `Quranpedia revelation type not supported: ${revelationType}`,
  );
}

export function mapQuranpediaSurahToDomain(
  surah: QuranpediaSurahIndexRecord,
): Surah {
  return new Surah({
    id: surah.id,
    number: surah.id,
    name: surah.name,
    codedName: surah.coded_name,
    translatedName: surah.translated_name.trim(),
    numberOfAyahs: surah.number_of_ayahs,
    firstPage: surah.first_page,
    lastPage: surah.last_page,
    firstJuz: surah.first_juz,
    revelationType: resolveRevelationType(surah.revelation_type),
    revelationOrder: surah.revelation_order,
  });
}

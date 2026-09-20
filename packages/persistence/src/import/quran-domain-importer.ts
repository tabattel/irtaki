import { createGunzip } from "node:zlib";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { QIRAAT, RIWAYAT } from "@irtaki/domain";
import { prisma } from "../client/prisma";

const QURANPEDIA_RAW_ROOT =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw";

interface QuranpediaSurah {
  id: number;
  name: string;
  coded_name: string;
  translated_name: string | null;
  number_of_ayahs: number;
  first_page: number;
  last_page: number;
  first_juz: number;
  revelation_type: string;
  revelation_order: number;
}

interface QuranpediaAyah {
  id: number;
  number: number;
  surah: string;
  page_number: number;
  text: string;
  marker: string;
  juz: number;
  hizb: number;
  ruku: number;
  manzil: number;
  number_in_hafs: number[];
}

interface QuranpediaEnvelope<T> {
  data: T;
}

async function readGzipJson<T>(fileName: string): Promise<T> {
  const filePath = join(QURANPEDIA_RAW_ROOT, fileName);

  const stream = createReadStream(filePath).pipe(createGunzip());

  let content = "";

  for await (const chunk of stream) {
    content += chunk.toString();
  }

  const parsed = JSON.parse(content) as QuranpediaEnvelope<T>;

  return parsed.data;
}

async function loadSurahs(): Promise<QuranpediaSurah[]> {
  return readGzipJson<QuranpediaSurah[]>("surahs-index.json.gz");
}

async function loadAyahs(): Promise<QuranpediaAyah[]> {
  const mushaf = await readGzipJson<{
    id: number;
    name: string;
    rawi: {
      id: number;
      name: string;
    };
    surahs: Array<{
      id: number;
      name: string;
      coded_name: string;
      ayahs: QuranpediaAyah[];
    }>;
  }>("mushafs-1.json.gz");

  return mushaf.surahs.flatMap((surah) => surah.ayahs);
}

function mapRevelationType(
  revelationType: string,
): "meccan" | "medinan" {
  return revelationType.toLowerCase() === "meccan"
    ? "meccan"
    : "medinan";
}

export async function importQuranDomain(): Promise<void> {
  const surahs = await loadSurahs();
  const ayahs = await loadAyahs();

  await prisma.$transaction(async (tx) => {
    for (const qiraa of QIRAAT) {
      await tx.qiraa.upsert({
        where: { id: qiraa.id },
        update: {
          shortName: qiraa.shortName,
          fullName: qiraa.fullName,
          region: qiraa.region,
        },
        create: {
          id: qiraa.id,
          shortName: qiraa.shortName,
          fullName: qiraa.fullName,
          region: qiraa.region,
        },
      });
    }

    for (const riwaya of RIWAYAT) {
      await tx.riwaya.upsert({
        where: { id: riwaya.id },
        update: {
          shortName: riwaya.shortName,
          fullName: riwaya.fullName,
          qiraaId: riwaya.qiraaId,
        },
        create: {
          id: riwaya.id,
          shortName: riwaya.shortName,
          fullName: riwaya.fullName,
          qiraaId: riwaya.qiraaId,
        },
      });

      for (const tariq of riwaya.tariqs) {
        await tx.tariq.upsert({
          where: { id: tariq.id },
          update: {
            name: tariq.name,
            riwayaId: riwaya.id,
          },
          create: {
            id: tariq.id,
            name: tariq.name,
            riwayaId: riwaya.id,
          },
        });
      }
    }

    for (const surah of surahs) {
      await tx.surah.upsert({
        where: { id: surah.id },
        update: {
          number: surah.id,
          name: surah.name,
          codedName: surah.coded_name,
          translatedName: surah.translated_name,
          numberOfAyahs: surah.number_of_ayahs,
          firstPage: surah.first_page,
          lastPage: surah.last_page,
          firstJuz: surah.first_juz,
          revelationType: mapRevelationType(surah.revelation_type),
          revelationOrder: surah.revelation_order,
        },
        create: {
          id: surah.id,
          number: surah.id,
          name: surah.name,
          codedName: surah.coded_name,
          translatedName: surah.translated_name,
          numberOfAyahs: surah.number_of_ayahs,
          firstPage: surah.first_page,
          lastPage: surah.last_page,
          firstJuz: surah.first_juz,
          revelationType: mapRevelationType(surah.revelation_type),
          revelationOrder: surah.revelation_order,
        },
      });
    }

    for (const ayah of ayahs) {
      await tx.ayah.upsert({
        where: { id: ayah.id },
        update: {
          number: ayah.number,
          surahNumber: Number(ayah.surah),
          text: ayah.text,
          pageNumber: ayah.page_number,
          juz: ayah.juz,
          hizb: ayah.hizb,
          manzil: ayah.manzil,
          ruku: ayah.ruku,
          marker: ayah.marker,
          numberInHafs: ayah.number_in_hafs,
        },
        create: {
          id: ayah.id,
          number: ayah.number,
          surahNumber: Number(ayah.surah),
          text: ayah.text,
          pageNumber: ayah.page_number,
          juz: ayah.juz,
          hizb: ayah.hizb,
          manzil: ayah.manzil,
          ruku: ayah.ruku,
          marker: ayah.marker,
          numberInHafs: ayah.number_in_hafs,
        },
      });
    }
  });

  console.log(
    `Quran Domain import completed: ${surahs.length} surahs, ${ayahs.length} ayahs.`,
  );
}

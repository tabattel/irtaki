import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { prisma } from "../client/prisma";
import {
  HAFS_AUDIO_DIRECTORIES,
  type AudioReciterId,
} from "@irtaki/audio";

const HAFS_RIWAYA_ID = 10;
const AUDIO_ROOT = join(
  process.cwd(),
  "../../storage/audio/coran/hafs/opus",
);

const BATCH_SIZE = 500;

const HAFS_RECITERS = [
  {
    id: "hafs-afassi",
    name: "Mishary Alafasy",
    arabicName: "مشاري راشد العفاسي",
  },
  {
    id: "hafs-abdelbasset",
    name: "Abdelbasset Abdelsamad",
    arabicName: "عبد الباسط عبد الصمد",
  },
  {
    id: "hafs-soudais",
    name: "Abdulrahman Al-Sudais",
    arabicName: "عبد الرحمن السديس",
  },
  {
    id: "hafs-houssari",
    name: "Mahmoud Khalil Al-Hussary",
    arabicName: "محمود خليل الحصري",
  },
  {
    id: "hafs-chatir",
    name: "Abu Bakr Al-Shatri",
    arabicName: "أبو بكر الشاطري",
  },
  {
    id: "hafs-djebril",
    name: "Mohamed Jebril",
    arabicName: "محمد جبريل",
  },
] as const;

const AUDIO_FILE_PATTERN = /^(\d{3})(\d{3})\.opus$/;

interface AudioFile {
  readonly reciterId: string;
  readonly surahNumber: number;
  readonly ayahNumber: number;
  readonly fileName: string;
}

async function discoverAudioFiles(): Promise<AudioFile[]> {
  const files: AudioFile[] = [];

  for (const reciter of HAFS_RECITERS) {
    const directory = join(
      AUDIO_ROOT,
      HAFS_AUDIO_DIRECTORIES[reciter.id as AudioReciterId],
    );
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const match = AUDIO_FILE_PATTERN.exec(entry.name);

      if (!match) {
        throw new Error(
          `Invalid audio filename for ${reciter.id}: ${entry.name}`,
        );
      }

      const surahNumber = Number(match[1]);
      const ayahNumber = Number(match[2]);

      files.push({
        reciterId: reciter.id,
        surahNumber,
        ayahNumber,
        fileName: entry.name,
      });
    }
  }

  return files;
}

async function validateAudioDataset(
  files: readonly AudioFile[],
): Promise<void> {
  const expectedCountPerReciter = 6236;

  for (const reciter of HAFS_RECITERS) {
    const count = files.filter(
      (file) => file.reciterId === reciter.id,
    ).length;

    if (count !== expectedCountPerReciter) {
      throw new Error(
        `Invalid audio file count for ${reciter.id}: ` +
          `expected ${expectedCountPerReciter}, found ${count}.`,
      );
    }
  }

  if (files.length !== expectedCountPerReciter * HAFS_RECITERS.length) {
    throw new Error(
      `Invalid total audio file count: expected ` +
        `${expectedCountPerReciter * HAFS_RECITERS.length}, ` +
        `found ${files.length}.`,
    );
  }

  const duplicateKeys = new Set<string>();

  for (const file of files) {
    const key =
      `${file.reciterId}:${file.surahNumber}:${file.ayahNumber}`;

    if (duplicateKeys.has(key)) {
      throw new Error(`Duplicate audio track: ${key}`);
    }

    duplicateKeys.add(key);

    if (file.surahNumber < 1 || file.surahNumber > 114) {
      throw new Error(
        `Invalid surah number in ${file.fileName}: ` +
          file.surahNumber,
      );
    }

    if (file.ayahNumber < 1) {
      throw new Error(
        `Invalid ayah number in ${file.fileName}: ` +
          file.ayahNumber,
      );
    }
  }
}

export async function importAudioReciters(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const riwaya = await tx.riwaya.findUnique({
      where: { id: HAFS_RIWAYA_ID },
      select: { id: true },
    });

    if (!riwaya) {
      throw new Error(
        `Cannot import audio reciters: Riwaya ` +
          `${HAFS_RIWAYA_ID} does not exist.`,
      );
    }

    for (const reciter of HAFS_RECITERS) {
      await tx.reciter.upsert({
        where: { id: reciter.id },
        update: {
          name: reciter.name,
          arabicName: reciter.arabicName,
          riwayaId: HAFS_RIWAYA_ID,
        },
        create: {
          id: reciter.id,
          name: reciter.name,
          arabicName: reciter.arabicName,
          riwayaId: HAFS_RIWAYA_ID,
        },
      });
    }
  });
}

export async function importAudioTracks(): Promise<void> {
  const files = await discoverAudioFiles();

  await validateAudioDataset(files);

  const ayahs = await prisma.ayah.findMany({
    select: {
      id: true,
      surahNumber: true,
      number: true,
    },
  });

  const ayahByKey = new Map(
    ayahs.map((ayah) => [
      `${ayah.surahNumber}:${ayah.number}`,
      ayah.id,
    ]),
  );

  const rows = files.map((file) => {
    const ayahId = ayahByKey.get(
      `${file.surahNumber}:${file.ayahNumber}`,
    );

    if (ayahId === undefined) {
      throw new Error(
        `Ayah not found for audio file: ${file.fileName}`,
      );
    }

    return {
      ayahId,
      reciterId: file.reciterId,
      format: "opus" as const,
      durationMs: null,
      sourceKey:
        `audio/ayah/${file.reciterId}:` +
        `${file.surahNumber.toString().padStart(3, "0")}` +
        `${file.ayahNumber.toString().padStart(3, "0")}`,
    };
  });

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);

    await prisma.audioTrack.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  console.log(
    `Audio tracks import completed: ${rows.length} tracks.`,
  );
}

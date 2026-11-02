import { open } from "node:fs/promises";
import { join } from "node:path";

import {
  createAudioResourceId,
  createLocalAudioProvider,
  type AudioReciterId,
} from "@irtaki/audio";
import { getAyahsBySurah } from "@/application/ayah/get-ayahs-by-surah";
import { NextResponse } from "next/server";

const AUDIO_ROOT = join(process.cwd(), "storage/audio/coran/hafs/opus");
const provider = createLocalAudioProvider(AUDIO_ROOT);

const RECITER_IDS: AudioReciterId[] = [
  "hafs-afassi",
  "hafs-abdelbasset",
  "hafs-soudais",
  "hafs-houssari",
  "hafs-chatir",
  "hafs-djebril",
];

const OPUS_SAMPLE_RATE = 48000;
const MAX_OGG_PAGE_SIZE = 65307;
const INVALID_GRANULE = BigInt("18446744073709551615");

const durationCache = new Map<
  string,
  { size: number; mtimeMs: number; durationSeconds: number }
>();

async function readOpusDuration(filePath: string): Promise<number> {
  const handle = await open(filePath, "r");

  try {
    const info = await handle.stat();

    if (!info.isFile() || info.size < 64) {
      throw new Error("Invalid audio file");
    }

    const cached = durationCache.get(filePath);

    if (
      cached &&
      cached.size === info.size &&
      cached.mtimeMs === info.mtimeMs
    ) {
      return cached.durationSeconds;
    }

    const head = Buffer.alloc(Math.min(info.size, 256));
    const headRead = await handle.read(head, 0, head.length, 0);

    if (
      headRead.bytesRead !== head.length ||
      head.toString("ascii", 0, 4) !== "OggS" ||
      head.indexOf("OpusHead") < 0
    ) {
      throw new Error("Ogg Opus header not found");
    }

    const tailLength = Math.min(info.size, MAX_OGG_PAGE_SIZE);
    const tail = Buffer.alloc(tailLength);
    const tailRead = await handle.read(
      tail,
      0,
      tailLength,
      info.size - tailLength,
    );

    if (tailRead.bytesRead !== tailLength) {
      throw new Error("Unable to read final Ogg page");
    }

    let finalGranulePosition: bigint | null = null;

    for (let index = tail.length - 27; index >= 0; index -= 1) {
      if (
        tail.readUInt8(index) !== 0x4f ||
        tail.readUInt8(index + 1) !== 0x67 ||
        tail.readUInt8(index + 2) !== 0x67 ||
        tail.readUInt8(index + 3) !== 0x53
      ) {
        continue;
      }

      const segmentCount = tail.readUInt8(index + 26);
      const segmentTableStart = index + 27;
      const segmentTableEnd = segmentTableStart + segmentCount;

      if (segmentTableEnd > tail.length) continue;

      let payloadSize = 0;

      for (let segment = segmentTableStart; segment < segmentTableEnd; segment += 1) {
        payloadSize += tail.readUInt8(segment);
      }

      if (segmentTableEnd + payloadSize !== tail.length) continue;

      const headerType = tail.readUInt8(index + 5);

      // EOS : dernière page de l'ogg.
      if ((headerType & 0x04) === 0) continue;

      const granulePosition = tail.readBigUInt64LE(index + 6);

      if (granulePosition === INVALID_GRANULE) continue;

      finalGranulePosition = granulePosition;
      break;
    }

    if (finalGranulePosition === null || finalGranulePosition.toString() === "0") {
      throw new Error("Final Ogg granule position not found");
    }

    // La durée suit le granule final / 48000.
    // Cette méthode correspond à la mesure ffprobe vérifiée sur un fichier
    // Opus du stockage IRTAKI.
    const durationSeconds =
      Number(finalGranulePosition) / OPUS_SAMPLE_RATE;

    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error("Invalid Opus duration");
    }

    durationCache.set(filePath, {
      size: info.size,
      mtimeMs: info.mtimeMs,
      durationSeconds,
    });

    return durationSeconds;
  } finally {
    await handle.close();
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const index = cursor;
        cursor += 1;

        if (index >= items.length) return;

        const item = items[index];
        if (item === undefined) return;

        results[index] = await mapper(item);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export async function POST(request: Request) {
  const parsedBody: unknown = await request.json().catch(() => null);

  if (
    !parsedBody ||
    typeof parsedBody !== "object" ||
    Array.isArray(parsedBody)
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const body = parsedBody as Record<string, unknown>;
  const reciterId = body.reciterId;
  const startSurah = body.startSurah;
  const startAyah = body.startAyah;
  const endSurah = body.endSurah;
  const endAyah = body.endAyah;

  if (
    typeof reciterId !== "string" ||
    !RECITER_IDS.includes(reciterId as AudioReciterId) ||
    !isInteger(startSurah) ||
    !isInteger(startAyah) ||
    !isInteger(endSurah) ||
    !isInteger(endAyah) ||
    startSurah < 1 ||
    startSurah > 114 ||
    endSurah < 1 ||
    endSurah > 114 ||
    startAyah < 1 ||
    endAyah < 1 ||
    startSurah > endSurah ||
    (startSurah === endSurah && startAyah > endAyah)
  ) {
    return NextResponse.json(
      { error: "Invalid audio range" },
      { status: 400 },
    );
  }

  try {
    const surahNumbers = Array.from(
      { length: endSurah - startSurah + 1 },
      (_, index) => startSurah + index,
    );

    const surahAyahs = await mapWithConcurrency(
      surahNumbers,
      8,
      (surahNumber) => getAyahsBySurah(surahNumber),
    );

    const selectedAyahs = surahAyahs
      .flat()
      .filter(
        (ayah) =>
          (ayah.surahNumber > startSurah ||
            (ayah.surahNumber === startSurah && ayah.number >= startAyah)) &&
          (ayah.surahNumber < endSurah ||
            (ayah.surahNumber === endSurah && ayah.number <= endAyah)),
      )
      .sort(
        (a, b) =>
          a.surahNumber - b.surahNumber || a.number - b.number,
      );

    const firstAyah = selectedAyahs[0];
    const lastAyah = selectedAyahs[selectedAyahs.length - 1];

    if (
      !firstAyah ||
      !lastAyah ||
      firstAyah.surahNumber !== startSurah ||
      firstAyah.number !== startAyah ||
      lastAyah.surahNumber !== endSurah ||
      lastAyah.number !== endAyah
    ) {
      return NextResponse.json(
        { error: "Audio range not found" },
        { status: 404 },
      );
    }

    const durations = await mapWithConcurrency(
      selectedAyahs,
      12,
      async (ayah) => {
        const resourceId = createAudioResourceId(
          reciterId as AudioReciterId,
          ayah.surahNumber,
          ayah.number,
        );

        const filePath = provider.resolve(resourceId);

        if (!filePath) {
          throw new Error("Audio resource not found");
        }

        return readOpusDuration(filePath);
      },
    );

    const totalDurationSeconds = durations.reduce(
      (total, duration) => total + duration,
      0,
    );

    if (!Number.isFinite(totalDurationSeconds) || totalDurationSeconds <= 0) {
      throw new Error("Invalid total audio duration");
    }

    return NextResponse.json({
      data: {
        ayahCount: selectedAyahs.length,
        totalDurationSeconds,
      },
    });
  } catch (error) {
    console.error("[AUDIO][DURATION]", error);

    return NextResponse.json(
      { error: "Unable to calculate audio duration" },
      { status: 500 },
    );
  }
}

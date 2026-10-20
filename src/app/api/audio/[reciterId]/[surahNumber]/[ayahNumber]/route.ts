import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { Readable } from "node:stream";
import { join } from "node:path";

import {
  createAudioResourceId,
  createLocalAudioProvider,
  type AudioReciterId,
} from "@irtaki/audio";
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

type RouteContext = {
  params: Promise<{
    reciterId: string;
    surahNumber: string;
    ayahNumber: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { reciterId, surahNumber, ayahNumber } = await context.params;

  if (!RECITER_IDS.includes(reciterId as AudioReciterId)) {
    return NextResponse.json({ error: "Invalid reciter" }, { status: 400 });
  }

  const surah = Number(surahNumber);
  const ayah = Number(ayahNumber);

  if (
    !Number.isInteger(surah) ||
    surah < 1 ||
    surah > 114 ||
    !Number.isInteger(ayah) ||
    ayah < 1
  ) {
    return NextResponse.json(
      { error: "Invalid audio location" },
      { status: 400 },
    );
  }

  const resourceId = createAudioResourceId(
    reciterId as AudioReciterId,
    surah,
    ayah,
  );

  const filePath = provider.resolve(resourceId);

  if (!filePath) {
    return NextResponse.json(
      { error: "Audio resource not found" },
      { status: 404 },
    );
  }

  try {
    await access(filePath, constants.R_OK);

    const file = await stat(filePath);
    const fileSize = file.size;
    const range = request.headers.get("range");

    if (!range) {
      const stream = Readable.toWeb(
        createReadStream(filePath),
      ) as ReadableStream;

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "audio/ogg; codecs=opus",
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);

    if (!match) {
      return new Response(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileSize}`,
        },
      });
    }

    const start = match[1] ? Number(match[1]) : 0;
    const requestedEnd = match[2] ? Number(match[2]) : fileSize - 1;
    const end = Math.min(requestedEnd, fileSize - 1);

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      start > end ||
      start >= fileSize
    ) {
      return new Response(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileSize}`,
        },
      });
    }

    const contentLength = end - start + 1;

    const stream = Readable.toWeb(
      createReadStream(filePath, {
        start,
        end,
      }),
    ) as ReadableStream;

    return new Response(stream, {
      status: 206,
      headers: {
        "Content-Type": "audio/ogg; codecs=opus",
        "Content-Length": String(contentLength),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Audio file not found" },
      { status: 404 },
    );
  }
}

import { join } from "node:path";

import {
  createJsonGzipReader,
  createQuranpediaQiraatIndex,
  createQuranpediaQiraatLoader,
  type QuranpediaQiraatIndex,
  type QuranpediaQiraatWord,
} from "@irtaki/resource";

const DEFAULT_RAW_ROOT =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw";

const DATA_FILE_NAME = "qiraat.json.gz";

const loader = createQuranpediaQiraatLoader(createJsonGzipReader());

const indexCache = new Map<string, Promise<QuranpediaQiraatIndex>>();

export type QiraatForAyahResult =
  | {
      readonly status: "found";
      readonly surah: number;
      readonly ayah: number;
      readonly dataVersion: string;
      readonly words: readonly QuranpediaQiraatWord[];
    }
  | {
      readonly status: "missing";
      readonly surah: number;
      readonly ayah: number;
      readonly dataVersion: string;
      readonly words: readonly [];
    };

function getRawRoot(): string {
  return (
    process.env.QURANPEDIA_QIRAAT_RAW_ROOT?.trim() ||
    process.env.QURANPEDIA_RAW_ROOT?.trim() ||
    DEFAULT_RAW_ROOT
  );
}

async function getQiraatIndex(): Promise<QuranpediaQiraatIndex> {
  const rawRoot = getRawRoot();
  const cached = indexCache.get(rawRoot);

  if (cached) {
    return cached;
  }

  const pending = (async () => {
    const document = await loader.read(join(rawRoot, DATA_FILE_NAME));
    return createQuranpediaQiraatIndex(document);
  })();

  indexCache.set(rawRoot, pending);

  void pending.catch(() => {
    if (indexCache.get(rawRoot) === pending) {
      indexCache.delete(rawRoot);
    }
  });

  return pending;
}

export async function getQiraatForAyah(
  surah: number,
  ayah: number,
): Promise<QiraatForAyahResult> {
  if (
    !Number.isInteger(surah) ||
    surah < 1 ||
    surah > 114 ||
    !Number.isInteger(ayah) ||
    ayah < 1
  ) {
    throw new RangeError(`Invalid Qiraat coordinates: ${surah}:${ayah}`);
  }

  const index = await getQiraatIndex();
  const lookup = index.lookup(surah, ayah);

  if (lookup.status === "missing") {
    return {
      status: "missing",
      surah,
      ayah,
      dataVersion: index.dataVersion,
      words: [],
    };
  }

  return {
    status: "found",
    surah,
    ayah,
    dataVersion: index.dataVersion,
    words: lookup.entry.qiraat,
  };
}

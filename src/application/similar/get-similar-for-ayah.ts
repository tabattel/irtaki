import { join } from "node:path";

import {
  createJsonGzipReader,
  createQuranpediaSimilarIndex,
  createQuranpediaSimilarLoader,
  type QuranpediaSimilarGroup,
  type QuranpediaSimilarIndex,
} from "@irtaki/resource";

const DEFAULT_RAW_ROOT =
  "/home/zaki/irtaki/storage/quranpedia/2026-10-31/raw";

const DATA_FILE_NAME = "similar.json.gz";

const loader = createQuranpediaSimilarLoader(createJsonGzipReader());

const indexCache = new Map<string, Promise<QuranpediaSimilarIndex>>();

export type SimilarForAyahResult =
  | {
      readonly status: "found";
      readonly surah: number;
      readonly ayah: number;
      readonly dataVersion: string;
      readonly groups: readonly QuranpediaSimilarGroup[];
    }
  | {
      readonly status: "missing";
      readonly surah: number;
      readonly ayah: number;
      readonly dataVersion: string;
      readonly groups: readonly [];
    };

function getRawRoot(): string {
  return (
    process.env.QURANPEDIA_SIMILAR_RAW_ROOT?.trim() ||
    DEFAULT_RAW_ROOT
  );
}

async function getSimilarIndex(): Promise<QuranpediaSimilarIndex> {
  const rawRoot = getRawRoot();
  const cached = indexCache.get(rawRoot);

  if (cached) {
    return cached;
  }

  const pending = (async () => {
    const document = await loader.read(join(rawRoot, DATA_FILE_NAME));
    return createQuranpediaSimilarIndex(document);
  })();

  indexCache.set(rawRoot, pending);

  void pending.catch(() => {
    if (indexCache.get(rawRoot) === pending) {
      indexCache.delete(rawRoot);
    }
  });

  return pending;
}

export async function getSimilarForAyah(
  surah: number,
  ayah: number,
): Promise<SimilarForAyahResult> {
  if (
    !Number.isInteger(surah) ||
    surah < 1 ||
    surah > 114 ||
    !Number.isInteger(ayah) ||
    ayah < 1
  ) {
    throw new RangeError(`Invalid ayah coordinates: ${surah}:${ayah}`);
  }

  const index = await getSimilarIndex();
  const lookup = index.lookup(surah, ayah);

  if (
    lookup.status === "missing" ||
    lookup.entry.similar.length === 0
  ) {
    return {
      status: "missing",
      surah,
      ayah,
      dataVersion: index.dataVersion,
      groups: [],
    };
  }

  return {
    status: "found",
    surah,
    ayah,
    dataVersion: index.dataVersion,
    groups: lookup.entry.similar,
  };
}

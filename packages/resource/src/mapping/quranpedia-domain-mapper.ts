import { Mushaf, QIRAAT, RIWAYAT } from "@irtaki/domain";

import type { QuranpediaMushafRaw } from "../provider/quranpedia/quranpedia-mushaf";

export function resolveQuranpediaQiraaId(
  mushaf: QuranpediaMushafRaw,
): number {
  const qiraa = QIRAAT.find(
    (candidate) =>
      candidate.id === mushaf.rawi.qiraa.id &&
      candidate.shortName === mushaf.rawi.qiraa.name,
  );

  if (!qiraa) {
    throw new Error(
      `Quranpedia qiraa not found: id=${mushaf.rawi.qiraa.id}, name=${mushaf.rawi.qiraa.name}`,
    );
  }

  return qiraa.id;
}

export function resolveQuranpediaRiwayaId(
  mushaf: QuranpediaMushafRaw,
): number {
  const qiraaId = resolveQuranpediaQiraaId(mushaf);

  const riwaya = RIWAYAT.find(
    (candidate) =>
      candidate.qiraaId === qiraaId &&
      candidate.shortName === mushaf.rawi.name,
  );

  if (!riwaya) {
    throw new Error(
      `Quranpedia riwaya not found: qiraa=${qiraaId}, rawi=${mushaf.rawi.name}`,
    );
  }

  return riwaya.id;
}

export function mapQuranpediaMushafToDomain(
  mushaf: QuranpediaMushafRaw,
): Mushaf {
  return new Mushaf({
    id: mushaf.id,
    name: mushaf.name,
    description: mushaf.description ?? undefined,
    bismillah: mushaf.bismillah ?? undefined,
    riwayaId: resolveQuranpediaRiwayaId(mushaf),
  });
}

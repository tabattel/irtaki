import { Mushaf } from "@irtaki/domain";

export interface QuranpediaMushafRecord {
  readonly id: number;
  readonly name: string;
  readonly description?: string;
  readonly bismillah?: string;
  readonly riwayaId: number;
}

export function mapQuranpediaMushafToDomain(
  record: QuranpediaMushafRecord,
): Mushaf {
  return new Mushaf({
    id: record.id,
    name: record.name,
    description: record.description,
    bismillah: record.bismillah,
    riwayaId: record.riwayaId,
  });
}

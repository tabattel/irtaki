export type MushafDto = {
  id: number;
  name: string;
  description: string | null;
  bismillah: string | null;
  riwayaId: number;
};

export function toMushafDto(mushaf: {
  id: number;
  name: string;
  description: string | null;
  bismillah: string | null;
  riwayaId: number;
}): MushafDto {
  return {
    id: mushaf.id,
    name: mushaf.name,
    description: mushaf.description,
    bismillah: mushaf.bismillah,
    riwayaId: mushaf.riwayaId,
  };
}

export type TariqDto = {
  id: number;
  name: string;
  riwayaId: number;
};

export function toTariqDto(tariq: {
  id: number;
  name: string;
  riwayaId: number;
}): TariqDto {
  return {
    id: tariq.id,
    name: tariq.name,
    riwayaId: tariq.riwayaId,
  };
}

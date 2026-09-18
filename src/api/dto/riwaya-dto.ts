export type RiwayaDto = {
  id: number;
  shortName: string;
  fullName: string;
  qiraaId: number;
};

export function toRiwayaDto(riwaya: {
  id: number;
  shortName: string;
  fullName: string;
  qiraaId: number;
}): RiwayaDto {
  return {
    id: riwaya.id,
    shortName: riwaya.shortName,
    fullName: riwaya.fullName,
    qiraaId: riwaya.qiraaId,
  };
}

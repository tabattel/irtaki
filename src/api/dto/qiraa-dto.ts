export type QiraaDto = {
  id: number;
  shortName: string;
  fullName: string;
  region: string;
};

export function toQiraaDto(qiraa: {
  id: number;
  shortName: string;
  fullName: string;
  region: string;
}): QiraaDto {
  return {
    id: qiraa.id,
    shortName: qiraa.shortName,
    fullName: qiraa.fullName,
    region: qiraa.region,
  };
}

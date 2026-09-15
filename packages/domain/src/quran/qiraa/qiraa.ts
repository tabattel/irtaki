export type QiraaRegion = "madinah" | "makkah" | "basrah" | "damascus" | "kufa";

export interface QiraaProps {
  id: number;
  shortName: string;
  fullName: string;
  region: QiraaRegion;
}

export class Qiraa {
  public readonly id: number;
  public readonly shortName: string;
  public readonly fullName: string;
  public readonly region: QiraaRegion;

  constructor(props: QiraaProps) {
    if (!Number.isInteger(props.id) || props.id < 1 || props.id > 10) {
      throw new Error("Qiraa ID must be an integer between 1 and 10.");
    }

    if (props.shortName.trim().length === 0) {
      throw new Error("Qiraa short name cannot be empty.");
    }

    if (props.fullName.trim().length === 0) {
      throw new Error("Qiraa full name cannot be empty.");
    }

    this.id = props.id;
    this.shortName = props.shortName.trim();
    this.fullName = props.fullName.trim();
    this.region = props.region;
  }
}

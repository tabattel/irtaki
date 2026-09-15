import { Tariq } from "../tariq/tariq";

export interface RiwayaProps {
  id: number;
  shortName: string;
  fullName: string;
  qiraaId: number;
  tariqs?: Tariq[];
}

export class Riwaya {
  private static readonly MAX_TARIQS = 2;

  public readonly id: number;
  public readonly shortName: string;
  public readonly fullName: string;
  public readonly qiraaId: number;

  private readonly _tariqs: Tariq[];

  constructor(props: RiwayaProps) {
    if (!Number.isInteger(props.id) || props.id < 1) {
      throw new Error("Riwaya ID must be a positive integer.");
    }

    if (
      !Number.isInteger(props.qiraaId) ||
      props.qiraaId < 1 ||
      props.qiraaId > 10
    ) {
      throw new Error("Riwaya qiraa ID must be an integer between 1 and 10.");
    }

    if (props.shortName.trim().length === 0) {
      throw new Error("Riwaya short name cannot be empty.");
    }

    if (props.fullName.trim().length === 0) {
      throw new Error("Riwaya full name cannot be empty.");
    }

    this.id = props.id;
    this.shortName = props.shortName.trim();
    this.fullName = props.fullName.trim();
    this.qiraaId = props.qiraaId;

    const tariqs = props.tariqs ?? [];

    if (tariqs.length > Riwaya.MAX_TARIQS) {
      throw new Error("A riwaya can have at most two major tariqs.");
    }

    this._tariqs = [...tariqs];
  }

  get tariqs(): readonly Tariq[] {
    return this._tariqs;
  }

  addTariq(tariq: Tariq): void {
    if (this._tariqs.length >= Riwaya.MAX_TARIQS) {
      throw new Error("A riwaya can have at most two major tariqs.");
    }

    if (this._tariqs.some((existing) => existing.id === tariq.id)) {
      throw new Error("This tariq is already attached to the riwaya.");
    }

    this._tariqs.push(tariq);
  }
}

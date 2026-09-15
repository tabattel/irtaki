export interface MushafProps {
  id: number;
  name: string;
  description?: string;
  bismillah?: string;
  riwayaId: number;
}

export class Mushaf {
  public readonly id: number;
  public readonly name: string;
  public readonly description?: string;
  public readonly bismillah?: string;
  public readonly riwayaId: number;

  constructor(props: MushafProps) {
    if (!Number.isInteger(props.id) || props.id < 1) {
      throw new Error("Mushaf ID must be a positive integer.");
    }

    if (props.name.trim().length === 0) {
      throw new Error("Mushaf name cannot be empty.");
    }

    if (!Number.isInteger(props.riwayaId) || props.riwayaId < 1) {
      throw new Error("Mushaf riwaya ID must be a positive integer.");
    }

    this.id = props.id;
    this.name = props.name.trim();
    this.description = props.description?.trim();
    this.bismillah = props.bismillah?.trim();
    this.riwayaId = props.riwayaId;
  }
}

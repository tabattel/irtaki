export interface TariqProps {
  id: number;
  name: string;
}

export class Tariq {
  public readonly id: number;
  public readonly name: string;

  constructor(props: TariqProps) {
    if (!Number.isInteger(props.id) || props.id < 1) {
      throw new Error("Tariq ID must be a positive integer.");
    }

    if (props.name.trim().length === 0) {
      throw new Error("Tariq name cannot be empty.");
    }

    this.id = props.id;
    this.name = props.name.trim();
  }
}

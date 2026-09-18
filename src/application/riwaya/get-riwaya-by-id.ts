import { RiwayaRepository } from "@irtaki/persistence";

export async function getRiwayaById(id: number) {
  const repository = new RiwayaRepository();

  return repository.findById(id);
}

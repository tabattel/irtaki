import { RiwayaRepository } from "@irtaki/persistence";

export async function getRiwayat() {
  const repository = new RiwayaRepository();

  return repository.findAll();
}

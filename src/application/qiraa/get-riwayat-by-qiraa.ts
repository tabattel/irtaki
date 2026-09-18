import { RiwayaRepository } from "@irtaki/persistence";

export async function getRiwayatByQiraa(qiraaId: number) {
  const repository = new RiwayaRepository();

  return repository.findByQiraaId(qiraaId);
}

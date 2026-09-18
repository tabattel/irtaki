import { MushafRepository } from "@irtaki/persistence";

export async function getMushafsByRiwaya(riwayaId: number) {
  const repository = new MushafRepository();

  return repository.findByRiwayaId(riwayaId);
}

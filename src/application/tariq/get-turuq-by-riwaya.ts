import { TariqRepository } from "@irtaki/persistence";

export async function getTuruqByRiwaya(riwayaId: number) {
  const repository = new TariqRepository();

  return repository.findByRiwayaId(riwayaId);
}

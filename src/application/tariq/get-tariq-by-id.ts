import { TariqRepository } from "@irtaki/persistence";

export async function getTariqById(id: number) {
  const repository = new TariqRepository();

  return repository.findById(id);
}

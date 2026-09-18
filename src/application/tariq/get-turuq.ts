import { TariqRepository } from "@irtaki/persistence";

export async function getTuruq() {
  const repository = new TariqRepository();

  return repository.findAll();
}

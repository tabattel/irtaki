import { SurahRepository } from "@irtaki/persistence";

export async function getSurahById(id: number) {
  const repository = new SurahRepository();

  return repository.findById(id);
}

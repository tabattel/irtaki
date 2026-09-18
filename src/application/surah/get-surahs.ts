import { SurahRepository } from "@irtaki/persistence";

export async function getSurahs() {
  const repository = new SurahRepository();

  return repository.findAll();
}

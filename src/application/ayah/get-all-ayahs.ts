import { AyahRepository } from "@irtaki/persistence";

export async function getAllAyahs() {
  const repository = new AyahRepository();

  return repository.findAllForSearch();
}

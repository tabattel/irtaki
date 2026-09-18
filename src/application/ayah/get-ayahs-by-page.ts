import { AyahRepository } from "@irtaki/persistence";

export async function getAyahsByPage(pageNumber: number) {
  const repository = new AyahRepository();

  return repository.findByPageNumber(pageNumber);
}

import { AyahRepository } from "@irtaki/persistence";

export async function getAyahById(id: number) {
  const repository = new AyahRepository();

  return repository.findById(id);
}

import { MushafRepository } from "@irtaki/persistence";

export async function getMushafById(id: number) {
  const repository = new MushafRepository();

  return repository.findById(id);
}

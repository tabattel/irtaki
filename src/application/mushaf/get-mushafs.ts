import { MushafRepository } from "@irtaki/persistence";

export async function getMushafs() {
  const repository = new MushafRepository();

  return repository.findAll();
}

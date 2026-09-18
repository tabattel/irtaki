import { QiraaRepository } from "@irtaki/persistence";

export async function getQiraaById(id: number) {
  const repository = new QiraaRepository();

  return repository.findById(id);
}

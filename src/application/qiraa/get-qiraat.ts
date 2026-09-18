import { QiraaRepository } from "@irtaki/persistence";

export async function getQiraat() {
  const repository = new QiraaRepository();

  return repository.findAll();
}

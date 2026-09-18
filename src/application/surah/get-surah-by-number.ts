import { SurahRepository } from "@irtaki/persistence";

export async function getSurahByNumber(number: number) {
  const repository = new SurahRepository();

  return repository.findByNumber(number);
}

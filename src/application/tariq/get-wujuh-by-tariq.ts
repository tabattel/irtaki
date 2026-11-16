import { TariqRepository, WajhRepository } from "@irtaki/persistence";

export async function getWujuhByTariq(tariqId: number) {
  const tariq = await new TariqRepository().findById(tariqId);

  if (!tariq) {
    return null;
  }

  return new WajhRepository().findByTariqId(tariqId);
}

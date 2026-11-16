import type { Wajh } from "../generated/client";
import { prisma } from "../client/prisma";

export class WajhRepository {
  findByTariqId(tariqId: number): Promise<Wajh[]> {
    return prisma.wajh.findMany({
      where: { tariqId, isActive: true },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
  }
}

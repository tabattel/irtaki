import type { Wajh } from "../generated/client";
import { prisma } from "../client/prisma";

export class WajhRepository {
  async findById(id: number) {
    return prisma.wajh.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        tariqId: true,
        position: true,
        isDefault: true,
        isActive: true,
      },
    });
  }

  findByTariqId(tariqId: number): Promise<Wajh[]> {
    return prisma.wajh.findMany({
      where: { tariqId, isActive: true },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
  }
}

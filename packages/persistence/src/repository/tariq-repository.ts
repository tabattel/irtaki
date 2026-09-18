import type { Tariq } from "../generated/client";
import { prisma } from "../client/prisma";

export class TariqRepository {
  findById(id: number): Promise<Tariq | null> {
    return prisma.tariq.findUnique({
      where: { id },
    });
  }

  findByRiwayaId(riwayaId: number): Promise<Tariq[]> {
    return prisma.tariq.findMany({
      where: { riwayaId },
      orderBy: { id: "asc" },
    });
  }

  findAll(): Promise<Tariq[]> {
    return prisma.tariq.findMany({
      orderBy: { id: "asc" },
    });
  }
}

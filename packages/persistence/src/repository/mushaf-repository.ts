import type { Mushaf } from "../generated/client";
import { prisma } from "../client/prisma";

export class MushafRepository {
  findById(id: number): Promise<Mushaf | null> {
    return prisma.mushaf.findUnique({
      where: { id },
    });
  }

  findByRiwayaId(riwayaId: number): Promise<Mushaf[]> {
    return prisma.mushaf.findMany({
      where: { riwayaId },
      orderBy: { id: "asc" },
    });
  }

  findAll(): Promise<Mushaf[]> {
    return prisma.mushaf.findMany({
      orderBy: { id: "asc" },
    });
  }
}

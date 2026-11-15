import { prisma } from "../client/prisma";

export class TariqRepository {
  async findAll() {
    return prisma.tariq.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, riwayaId: true },
    });
  }

  async findById(id: number) {
    return prisma.tariq.findUnique({
      where: { id },
      select: { id: true, name: true, riwayaId: true },
    });
  }

  async findByRiwayaId(riwayaId: number) {
    return prisma.tariq.findMany({
      where: { riwayaId },
      orderBy: { id: "asc" },
      select: { id: true, name: true, riwayaId: true },
    });
  }
}

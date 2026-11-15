import { prisma } from "../client/prisma";

export class RiwayaRepository {
  async findAll() {
    return prisma.riwaya.findMany({
      orderBy: { id: "asc" },
      select: { id: true, shortName: true, fullName: true, qiraaId: true },
    });
  }

  async findById(id: number) {
    return prisma.riwaya.findUnique({
      where: { id },
      select: { id: true, shortName: true, fullName: true, qiraaId: true },
    });
  }

  async findByQiraaId(qiraaId: number) {
    return prisma.riwaya.findMany({
      where: { qiraaId },
      orderBy: { id: "asc" },
      select: { id: true, shortName: true, fullName: true, qiraaId: true },
    });
  }
}

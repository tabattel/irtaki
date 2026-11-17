import { prisma } from "../client/prisma";

export class RiwayaRepository {
  async findAllWithTuruqCount() {
    return prisma.riwaya.findMany({
      include: { _count: { select: { tariqs: true } } },
      orderBy: { id: "asc" },
    });
  }

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

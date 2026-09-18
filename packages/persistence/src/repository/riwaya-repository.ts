import type { Riwaya } from "../generated/client";
import { prisma } from "../client/prisma";

export class RiwayaRepository {
  findById(id: number): Promise<Riwaya | null> {
    return prisma.riwaya.findUnique({
      where: { id },
    });
  }

  findByQiraaId(qiraaId: number): Promise<Riwaya[]> {
    return prisma.riwaya.findMany({
      where: { qiraaId },
      orderBy: { id: "asc" },
    });
  }

  findAll(): Promise<Riwaya[]> {
    return prisma.riwaya.findMany({
      orderBy: { id: "asc" },
    });
  }
}

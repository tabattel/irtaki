import type { Qiraa } from "../generated/client";
import { prisma } from "../client/prisma";

export class QiraaRepository {
  findById(id: number): Promise<Qiraa | null> {
    return prisma.qiraa.findUnique({
      where: { id },
    });
  }

  findAll(): Promise<Qiraa[]> {
    return prisma.qiraa.findMany({
      orderBy: { id: "asc" },
    });
  }
}

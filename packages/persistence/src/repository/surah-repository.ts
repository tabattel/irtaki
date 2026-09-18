import type { Surah } from "../generated/client";
import { prisma } from "../client/prisma";

export class SurahRepository {
  findById(id: number): Promise<Surah | null> {
    return prisma.surah.findUnique({
      where: { id },
    });
  }

  findByNumber(number: number): Promise<Surah | null> {
    return prisma.surah.findUnique({
      where: { number },
    });
  }

  findAll(): Promise<Surah[]> {
    return prisma.surah.findMany({
      orderBy: { number: "asc" },
    });
  }
}

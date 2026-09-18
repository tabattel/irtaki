import type { Ayah } from "../generated/client";
import { prisma } from "../client/prisma";

export class AyahRepository {
  findById(id: number): Promise<Ayah | null> {
    return prisma.ayah.findUnique({
      where: { id },
    });
  }

  findBySurahNumber(surahNumber: number): Promise<Ayah[]> {
    return prisma.ayah.findMany({
      where: { surahNumber },
      orderBy: { number: "asc" },
    });
  }

  findByPageNumber(pageNumber: number): Promise<Ayah[]> {
    return prisma.ayah.findMany({
      where: { pageNumber },
      orderBy: [{ surahNumber: "asc" }, { number: "asc" }],
    });
  }
}

import type { Annotation } from "../generated/client";
import { prisma } from "../client/prisma";

export class AnnotationRepository {
  create(
    userId: string,
    ayahId: number,
    content: string,
  ): Promise<Annotation> {
    return prisma.annotation.create({
      data: {
        userId,
        ayahId,
        content,
      },
    });
  }

  findById(id: string, userId: string): Promise<Annotation | null> {
    return prisma.annotation.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  findByUserId(userId: string): Promise<Annotation[]> {
    return prisma.annotation.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  }

  findByUserAndAyah(
    userId: string,
    ayahId: number,
  ): Promise<Annotation[]> {
    return prisma.annotation.findMany({
      where: {
        userId,
        ayahId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  }

  update(
    id: string,
    userId: string,
    content: string,
  ): Promise<Annotation | null> {
    return prisma.annotation.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        content,
      },
    }).then(async (result) => {
      if (result.count === 0) {
        return null;
      }

      return prisma.annotation.findFirst({
        where: {
          id,
          userId,
        },
      });
    });
  }

  delete(id: string, userId: string): Promise<boolean> {
    return prisma.annotation.deleteMany({
      where: {
        id,
        userId,
      },
    }).then((result) => result.count > 0);
  }
}

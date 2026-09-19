import { prisma } from "../../client/prisma";

export type SessionRecord = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
};

export class SessionRepository {
  async create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    return prisma.session.create({
      data: {
        userId: input.userId,
        token: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return prisma.session.findUnique({
      where: { token: tokenHash },
    });
  }

  async deleteById(id: string): Promise<void> {
    await prisma.session.delete({
      where: { id },
    });
  }

  async deleteExpired(now: Date = new Date()): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });

    return result.count;
  }
}

import { prisma } from "../../client/prisma";

export class PasswordResetTokenRepository {
  async create({ userId, tokenHash, expiresAt }: { userId: string; tokenHash: string; expiresAt: Date }) {
    return await prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async findByTokenHash(tokenHash: string) {
    return await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async markUsed(id: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
  }

  async deleteExpired(now: Date): Promise<void> {
    await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lte: now } },
    });
  }
}

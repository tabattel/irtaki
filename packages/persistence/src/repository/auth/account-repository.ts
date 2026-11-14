import { prisma } from "../../client/prisma";

export type AccountRecord = {
  id: string;
  userId: string;
  provider: "credentials" | "google";
  providerAccountId: string;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class AccountRepository {
  async createCredentialsAccount(input: {
    userId: string;
    email: string;
    passwordHash: string;
  }): Promise<AccountRecord> {
    return prisma.account.create({
      data: {
        userId: input.userId,
        provider: "credentials",
        providerAccountId: input.email,
        passwordHash: input.passwordHash,
      },
    });
  }

  async findCredentialsByEmail(email: string): Promise<AccountRecord | null> {
    return prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "credentials",
          providerAccountId: email,
        },
      },
    });
  }

  async findGoogleByAccountId(
    providerAccountId: string,
  ): Promise<AccountRecord | null> {
    return prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId,
        },
      },
    });
  }

  async createGoogleAccount(input: {
    userId: string;
    providerAccountId: string;
  }): Promise<AccountRecord> {
    return prisma.account.create({
      data: {
        userId: input.userId,
        provider: "google",
        providerAccountId: input.providerAccountId,
      },
    });
  }

  async findByUserId(userId: string): Promise<AccountRecord[]> {
    return prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateCredentialsPassword(email: string, passwordHash: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("USER_NOT_FOUND");
    const account = await prisma.account.findFirst({
      where: { userId: user.id, provider: "credentials" },
    });
    if (!account) throw new Error("CREDENTIALS_ACCOUNT_NOT_FOUND");
    await prisma.account.update({
      where: { id: account.id },
      data: { passwordHash },
    });
  }
}

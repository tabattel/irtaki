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
}

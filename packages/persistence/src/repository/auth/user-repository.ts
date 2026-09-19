import { prisma } from "../../client/prisma";

export type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  emailVerifiedAt: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class UserRepository {
  async create(input: { email: string; name?: string }): Promise<UserRecord> {
    return prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
      },
    });
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }
}

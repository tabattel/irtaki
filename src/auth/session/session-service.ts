import { createHash, randomBytes } from "node:crypto";

import { SessionRepository } from "@irtaki/persistence";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type AuthSession = {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
};

export class SessionService {
  constructor(private readonly sessionRepository = new SessionRepository()) {}

  async createSession(userId: string): Promise<{
    token: string;
    session: AuthSession;
  }> {
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const session = await this.sessionRepository.create({
      userId,
      tokenHash,
      expiresAt,
    });

    return {
      token,
      session,
    };
  }

  async getSession(token: string): Promise<AuthSession | null> {
    const tokenHash = hashToken(token);

    const session = await this.sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      await this.sessionRepository.deleteById(session.id);
      return null;
    }

    return session;
  }

  async revokeSession(token: string): Promise<void> {
    const tokenHash = hashToken(token);

    const session = await this.sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      return;
    }

    await this.sessionRepository.deleteById(session.id);
  }
}

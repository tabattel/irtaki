import { randomBytes, createHash } from "node:crypto";
import { EmailSender } from "../email/email-sender";
import {
  UserRepository,
  PasswordResetTokenRepository,
  AccountRepository,
} from "@irtaki/persistence";
import { PasswordHasher } from "./password-hasher";
import { SessionService } from "../session/session-service";
import { normalizeEmail } from "../email/normalize-email";

export type PasswordResetEmail = {
  to: string;
  resetUrl: string;
};

function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8;
}

export class PasswordResetService {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly userRepository = new UserRepository(),
    private readonly passwordResetTokenRepository = new PasswordResetTokenRepository(),
    private readonly accountRepository = new AccountRepository(),
    private readonly sessionService = new SessionService(),
    private readonly hasher = new PasswordHasher(),
  ) {}

  async requestPasswordReset({
    email,
    origin,
  }: {
    email: string;
    origin: string;
  }): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) return;

    const accounts = await this.accountRepository.findByUserId(user.id);
    if (!accounts.some((a) => a.provider === "credentials")) return;

    await this.passwordResetTokenRepository.deleteByUserId(user.id);

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = `${origin}/reinitialiser-mot-de-passe?token=${token}`;
    await this.emailSender.sendPasswordReset({ to: normalizedEmail, resetUrl });
  }

  async resetPassword({
    token,
    password,
  }: {
    token: string;
    password: string;
  }): Promise<void> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await this.passwordResetTokenRepository.findByTokenHash(tokenHash);

    if (!record || record.usedAt) throw new Error("INVALID_RESET_TOKEN");
    if (record.expiresAt < new Date()) throw new Error("EXPIRED_RESET_TOKEN");
    if (!isValidPassword(password)) throw new Error("WEAK_PASSWORD");

    const user = await this.userRepository.findById(record.userId);
    if (!user) throw new Error("INVALID_RESET_TOKEN");

    const passwordHash = await this.hasher.hash(password);
    await this.accountRepository.updateCredentialsPassword(user.email, passwordHash);

    await this.passwordResetTokenRepository.markUsed(record.id);
    await this.sessionService.revokeAllSessionsForUser(record.userId);
    await this.passwordResetTokenRepository.deleteExpired(new Date());
  }
}

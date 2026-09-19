import {
  AccountRepository,
  SessionRepository,
  UserRepository,
} from "@irtaki/persistence";

import { normalizeEmail } from "../email/normalize-email";
import { PasswordHasher } from "../password/password-hasher";
import { SessionService } from "../session/session-service";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
};

export class AuthService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly accountRepository = new AccountRepository(),
    private readonly passwordHasher = new PasswordHasher(),
    private readonly sessionService = new SessionService(
      new SessionRepository(),
    ),
  ) {}

  async register(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<{
    user: AuthenticatedUser;
    token: string;
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
      createdAt: Date;
    };
  }> {
    const email = normalizeEmail(input.email);

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const user = await this.userRepository.create({
      email,
      name: input.name?.trim() || undefined,
    });

    await this.accountRepository.createCredentialsAccount({
      userId: user.id,
      email,
      passwordHash,
    });

    const result = await this.sessionService.createSession(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token: result.token,
      session: result.session,
    };
  }

  async login(input: { email: string; password: string }): Promise<{
    user: AuthenticatedUser;
    token: string;
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
      createdAt: Date;
    };
  }> {
    const email = normalizeEmail(input.email);

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const account = await this.accountRepository.findCredentialsByEmail(email);

    if (!account?.passwordHash) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const validPassword = await this.passwordHasher.verify(
      input.password,
      account.passwordHash,
    );

    if (!validPassword) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const result = await this.sessionService.createSession(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token: result.token,
      session: result.session,
    };
  }
  async getAuthenticatedUser(
    userId: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}

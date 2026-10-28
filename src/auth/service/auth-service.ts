import {
  AccountRepository,
  LearnerRepository,
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
    private readonly learnerRepository = new LearnerRepository(),
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

    await this.ensureDefaultLearner(user.id, user.name);

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

    // Complète également les comptes qui existaient avant les Learners.
    await this.ensureDefaultLearner(user.id, user.name);

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
  async updateOwnerName(
    userId: string,
    rawName: string,
  ): Promise<AuthenticatedUser> {
    const name = rawName.trim();

    if (!name || name.length > 100) {
      throw new Error("INVALID_OWNER_NAME");
    }

    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new Error("USER_NOT_FOUND");
    }

    const user = await this.userRepository.updateName(userId, name);

    await this.ensureDefaultLearner(user.id, name);

    const learners = await this.learnerRepository.findManyByUserId(user.id);
    const mainLearner = learners.find(
      (learner: { childProfileId: string | null }) =>
        learner.childProfileId === null,
    );

    if (mainLearner) {
      await this.learnerRepository.update(mainLearner.id, user.id, { name });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  private async ensureDefaultLearner(
    userId: string,
    name: string | null,
  ): Promise<void> {
    const learners = await this.learnerRepository.findManyByUserId(userId);

    if (
      learners.some(
        (learner: { childProfileId: string | null }) =>
          learner.childProfileId === null,
      )
    ) {
      return;
    }

    await this.learnerRepository.create({
      userId,
      name: name ?? undefined,
    });
  }

  async getAuthenticatedUser(
    userId: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return null;
    }

    // Répare aussi les comptes disposant déjà d'une session active.
    await this.ensureDefaultLearner(user.id, user.name);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}

import { describe, expect, it, vi } from "vitest";

import { AuthService } from "./auth-service";
import { SessionService } from "../session/session-service";

describe("AuthService", () => {
  function createDependencies() {
    return {
      userRepository: {
        create: vi.fn(),
        findByEmail: vi.fn(),
        findById: vi.fn(),
      },
      accountRepository: {
        createCredentialsAccount: vi.fn(),
        findCredentialsByEmail: vi.fn(),
        findGoogleByAccountId: vi.fn(),
        createGoogleAccount: vi.fn(),
      },
      passwordHasher: {
        hash: vi.fn(),
        verify: vi.fn(),
      },
      sessionService: {
        createSession: vi.fn(),
        getSession: vi.fn(),
        revokeSession: vi.fn(),
      },
    };
  }

  function createService(dependencies: ReturnType<typeof createDependencies>) {
    return new AuthService(
      dependencies.userRepository,
      dependencies.accountRepository,
      dependencies.passwordHasher,
      dependencies.sessionService as unknown as SessionService,
    );
  }

  it("registers a new user and creates a session", async () => {
    const dependencies = createDependencies();

    dependencies.userRepository.findByEmail.mockResolvedValue(null);

    dependencies.passwordHasher.hash.mockResolvedValue("password-hash");

    dependencies.userRepository.create.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      emailVerifiedAt: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    dependencies.accountRepository.createCredentialsAccount.mockResolvedValue({
      id: "account-1",
      userId: "user-1",
      provider: "credentials",
      providerAccountId: "user@example.com",
      passwordHash: "password-hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    dependencies.sessionService.createSession.mockResolvedValue({
      token: "session-token",
      session: {
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
      },
    });

    const service = createService(dependencies);

    const result = await service.register({
      email: "  USER@Example.COM ",
      password: "password-123",
      name: " User ",
    });

    expect(result.user).toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    expect(result.token).toBe("session-token");

    expect(dependencies.userRepository.create).toHaveBeenCalledWith({
      email: "user@example.com",
      name: "User",
    });

    expect(
      dependencies.accountRepository.createCredentialsAccount,
    ).toHaveBeenCalledWith({
      userId: "user-1",
      email: "user@example.com",
      passwordHash: "password-hash",
    });

    expect(dependencies.sessionService.createSession).toHaveBeenCalledWith(
      "user-1",
    );
  });

  it("rejects registration when the email already exists", async () => {
    const dependencies = createDependencies();

    dependencies.userRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      emailVerifiedAt: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = createService(dependencies);

    await expect(
      service.register({
        email: "USER@example.com",
        password: "password-123",
      }),
    ).rejects.toThrow("EMAIL_ALREADY_EXISTS");

    expect(dependencies.passwordHasher.hash).not.toHaveBeenCalled();
    expect(dependencies.userRepository.create).not.toHaveBeenCalled();
  });

  it("logs in with valid credentials", async () => {
    const dependencies = createDependencies();

    dependencies.userRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      emailVerifiedAt: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    dependencies.accountRepository.findCredentialsByEmail.mockResolvedValue({
      id: "account-1",
      userId: "user-1",
      provider: "credentials",
      providerAccountId: "user@example.com",
      passwordHash: "password-hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    dependencies.passwordHasher.verify.mockResolvedValue(true);

    dependencies.sessionService.createSession.mockResolvedValue({
      token: "session-token",
      session: {
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
      },
    });

    const service = createService(dependencies);

    const result = await service.login({
      email: " USER@Example.COM ",
      password: "password-123",
    });

    expect(result.user).toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    expect(result.token).toBe("session-token");

    expect(
      dependencies.accountRepository.findCredentialsByEmail,
    ).toHaveBeenCalledWith("user@example.com");

    expect(dependencies.passwordHasher.verify).toHaveBeenCalledWith(
      "password-123",
      "password-hash",
    );
  });

  it("rejects login for an unknown email", async () => {
    const dependencies = createDependencies();

    dependencies.userRepository.findByEmail.mockResolvedValue(null);

    const service = createService(dependencies);

    await expect(
      service.login({
        email: "unknown@example.com",
        password: "password-123",
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");

    expect(
      dependencies.accountRepository.findCredentialsByEmail,
    ).not.toHaveBeenCalled();
  });

  it("rejects login when the password is incorrect", async () => {
    const dependencies = createDependencies();

    dependencies.userRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      emailVerifiedAt: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    dependencies.accountRepository.findCredentialsByEmail.mockResolvedValue({
      id: "account-1",
      userId: "user-1",
      email: "user@example.com",
      provider: "credentials",
      providerAccountId: "user@example.com",
      passwordHash: "password-hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    dependencies.passwordHasher.verify.mockResolvedValue(false);

    const service = createService(dependencies);

    await expect(
      service.login({
        email: "user@example.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");

    expect(dependencies.sessionService.createSession).not.toHaveBeenCalled();
  });
  it("returns the authenticated user", async () => {
    const dependencies = createDependencies();

    dependencies.userRepository.findById.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      emailVerifiedAt: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = createService(dependencies);

    const result = await service.getAuthenticatedUser("user-1");

    expect(result).toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    expect(dependencies.userRepository.findById).toHaveBeenCalledWith("user-1");
  });

  it("returns null when the authenticated user does not exist", async () => {
    const dependencies = createDependencies();

    dependencies.userRepository.findById.mockResolvedValue(null);

    const service = createService(dependencies);

    const result = await service.getAuthenticatedUser("unknown-user");

    expect(result).toBeNull();

    expect(dependencies.userRepository.findById).toHaveBeenCalledWith(
      "unknown-user",
    );
  });
});

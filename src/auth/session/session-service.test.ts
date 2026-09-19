import { describe, expect, it, vi } from "vitest";

import { SessionService } from "./session-service";

describe("SessionService", () => {
  function createRepositoryMock() {
    return {
      create: vi.fn(),
      findByTokenHash: vi.fn(),
      deleteById: vi.fn(),
      deleteExpired: vi.fn(),
    };
  }

  it("creates a session with a secure token and stores only its hash", async () => {
    const repository = createRepositoryMock();

    repository.create.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      token: "stored-token-hash",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    const service = new SessionService(repository);

    const result = await service.createSession("user-1");

    expect(result.token).toMatch(/^[a-f0-9]{64}$/);

    expect(repository.create).toHaveBeenCalledTimes(1);

    const createInput = repository.create.mock.calls[0][0];

    expect(createInput.userId).toBe("user-1");
    expect(createInput.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createInput.tokenHash).not.toBe(result.token);
    expect(createInput.expiresAt).toBeInstanceOf(Date);
  });

  it("retrieves a valid session using the hashed token", async () => {
    const repository = createRepositoryMock();

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    repository.findByTokenHash.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      token: "stored-token-hash",
      expiresAt,
      createdAt: new Date(),
    });

    const service = new SessionService(repository);

    const token = "a".repeat(64);

    const result = await service.getSession(token);

    expect(result).not.toBeNull();
    expect(result?.id).toBe("session-1");
    expect(result?.userId).toBe("user-1");

    expect(repository.findByTokenHash).toHaveBeenCalledTimes(1);
    expect(repository.findByTokenHash).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });

  it("deletes an expired session and returns null", async () => {
    const repository = createRepositoryMock();

    repository.findByTokenHash.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      token: "stored-token-hash",
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    });

    const service = new SessionService(repository);

    const result = await service.getSession("a".repeat(64));

    expect(result).toBeNull();
    expect(repository.deleteById).toHaveBeenCalledWith("session-1");
  });

  it("returns null for an unknown session", async () => {
    const repository = createRepositoryMock();

    repository.findByTokenHash.mockResolvedValue(null);

    const service = new SessionService(repository);

    const result = await service.getSession("unknown-token");

    expect(result).toBeNull();
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("revokes an existing session", async () => {
    const repository = createRepositoryMock();

    repository.findByTokenHash.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      token: "stored-token-hash",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    const service = new SessionService(repository);

    await service.revokeSession("a".repeat(64));

    expect(repository.deleteById).toHaveBeenCalledWith("session-1");
  });

  it("does nothing when revoking an unknown session", async () => {
    const repository = createRepositoryMock();

    repository.findByTokenHash.mockResolvedValue(null);

    const service = new SessionService(repository);

    await service.revokeSession("unknown-token");

    expect(repository.deleteById).not.toHaveBeenCalled();
  });
});

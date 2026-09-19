import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleAuthService } from "./google-auth-service";

describe("GoogleAuthService", () => {
  const userRepository = {
    create: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
  };

  const accountRepository = {
    createCredentialsAccount: vi.fn(),
    findCredentialsByEmail: vi.fn(),
    findGoogleByAccountId: vi.fn(),
    createGoogleAccount: vi.fn(),
  };

  const sessionService = {
    createSession: vi.fn(),
    getSession: vi.fn(),
    revokeSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_REDIRECT_URI =
      "http://localhost:3000/api/auth/google/callback";
  });

  it("builds the Google authorization URL", () => {
    const service = new GoogleAuthService(
      userRepository as never,
      accountRepository as never,
      sessionService as never,
    );

    const url = service.getAuthorizationUrl("state-123");

    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth?");
    expect(url).toContain("client_id=google-client-id");
    expect(url).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fgoogle%2Fcallback",
    );
    expect(url).toContain("response_type=code");
    expect(url).toContain("state=state-123");
  });

  it("authenticates an existing Google account", async () => {
    accountRepository.findGoogleByAccountId.mockResolvedValue({
      id: "account-1",
      userId: "user-1",
      provider: "google",
      providerAccountId: "google-123",
      passwordHash: null,
    });

    userRepository.findById.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    sessionService.createSession.mockResolvedValue({
      token: "session-token",
      session: {},
    });

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              access_token: "access-token",
              token_type: "Bearer",
              expires_in: 3600,
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              sub: "google-123",
              email: "user@example.com",
              email_verified: true,
              name: "User",
            }),
            { status: 200 },
          ),
        ),
    );

    const service = new GoogleAuthService(
      userRepository as never,
      accountRepository as never,
      sessionService as never,
    );

    const result = await service.authenticate("authorization-code");

    expect(result.user).toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    expect(result.token).toBe("session-token");

    expect(accountRepository.findGoogleByAccountId).toHaveBeenCalledWith(
      "google-123",
    );
    expect(userRepository.findById).toHaveBeenCalledWith("user-1");
    expect(accountRepository.createGoogleAccount).not.toHaveBeenCalled();
  });

  it("creates a user and Google account for a new Google identity", async () => {
    accountRepository.findGoogleByAccountId.mockResolvedValue(null);

    userRepository.findByEmail.mockResolvedValue(null);

    userRepository.create.mockResolvedValue({
      id: "user-1",
      email: "new@example.com",
      name: "New User",
    });

    accountRepository.createGoogleAccount.mockResolvedValue({
      id: "account-1",
      userId: "user-1",
      provider: "google",
      providerAccountId: "google-456",
      passwordHash: null,
    });

    sessionService.createSession.mockResolvedValue({
      token: "session-token",
      session: {},
    });

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              access_token: "access-token",
              token_type: "Bearer",
              expires_in: 3600,
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              sub: "google-456",
              email: "NEW@example.com",
              email_verified: true,
              name: "New User",
            }),
            { status: 200 },
          ),
        ),
    );

    const service = new GoogleAuthService(
      userRepository as never,
      accountRepository as never,
      sessionService as never,
    );

    const result = await service.authenticate("authorization-code");

    expect(userRepository.create).toHaveBeenCalledWith({
      email: "new@example.com",
      name: "New User",
    });

    expect(accountRepository.createGoogleAccount).toHaveBeenCalledWith({
      userId: "user-1",
      providerAccountId: "google-456",
    });

    expect(result.token).toBe("session-token");
  });

  it("rejects an unverified Google email", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              access_token: "access-token",
              token_type: "Bearer",
              expires_in: 3600,
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              sub: "google-789",
              email: "user@example.com",
              email_verified: false,
            }),
            { status: 200 },
          ),
        ),
    );

    const service = new GoogleAuthService(
      userRepository as never,
      accountRepository as never,
      sessionService as never,
    );

    await expect(service.authenticate("authorization-code")).rejects.toThrow(
      "GOOGLE_EMAIL_NOT_VERIFIED",
    );
  });
});

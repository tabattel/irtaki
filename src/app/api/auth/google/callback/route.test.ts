import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateMock = vi.fn();

vi.mock("@/auth/google/google-auth-service", () => ({
  GoogleAuthService: class {
    authenticate = authenticateMock;
  },
}));

import { GET } from "./route";

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    authenticateMock.mockReset();
  });

  it("rejects an invalid OAuth state", async () => {
    const request = new Request(
      "http://localhost:3000/api/auth/google/callback?code=code-123&state=wrong-state",
      {
        headers: {
          cookie: "irtaki_google_state=expected-state",
        },
      },
    );

    const response = await GET(request);

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error: "INVALID_OAUTH_STATE",
    });

    expect(authenticateMock).not.toHaveBeenCalled();
  });

  it("rejects a callback without a code", async () => {
    const request = new Request(
      "http://localhost:3000/api/auth/google/callback?state=expected-state",
      {
        headers: {
          cookie: "irtaki_google_state=expected-state",
        },
      },
    );

    const response = await GET(request);

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error: "INVALID_OAUTH_STATE",
    });

    expect(authenticateMock).not.toHaveBeenCalled();
  });

  it("authenticates Google user and creates a session cookie", async () => {
    authenticateMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User",
      },
      token: "session-token",
    });

    const request = new Request(
      "http://localhost:3000/api/auth/google/callback?code=code-123&state=expected-state",
      {
        headers: {
          cookie: "irtaki_google_state=expected-state",
        },
      },
    );

    const response = await GET(request);

    expect(response.status).toBe(307);

    expect(authenticateMock).toHaveBeenCalledWith("code-123");

    const location = response.headers.get("location");

    expect(location).toBe("http://localhost:3000/");

    const cookie = response.headers.get("set-cookie");

    expect(cookie).toContain("irtaki_session=session-token");
    expect(cookie).toContain("irtaki_google_state=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
  });

  it("returns 401 when Google authentication fails", async () => {
    authenticateMock.mockRejectedValue(
      new Error("GOOGLE_TOKEN_EXCHANGE_FAILED"),
    );

    const request = new Request(
      "http://localhost:3000/api/auth/google/callback?code=code-123&state=expected-state",
      {
        headers: {
          cookie: "irtaki_google_state=expected-state",
        },
      },
    );

    const response = await GET(request);

    expect(response.status).toBe(401);

    await expect(response.json()).resolves.toEqual({
      error: "GOOGLE_AUTHENTICATION_FAILED",
    });
  });
});

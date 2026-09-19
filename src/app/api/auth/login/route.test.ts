import { beforeEach, describe, expect, it, vi } from "vitest";

const loginMock = vi.fn();

vi.mock("@/auth/service/auth-service", () => ({
  AuthService: class {
    login = loginMock;
  },
}));

import { POST } from "./route";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it("logs in a user and sets the session cookie", async () => {
    loginMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User",
      },
      token: "session-token",
      session: {
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
      },
    });

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        password: "password-123",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User",
      },
    });

    expect(loginMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password-123",
    });

    const cookie = response.headers.get("set-cookie");

    expect(cookie).toContain("irtaki_session=session-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
  });

  it("returns 400 for an invalid request", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error: "INVALID_REQUEST",
    });

    expect(loginMock).not.toHaveBeenCalled();
  });

  it("returns 401 for invalid credentials", async () => {
    loginMock.mockRejectedValue(new Error("INVALID_CREDENTIALS"));

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        password: "wrong-password",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);

    await expect(response.json()).resolves.toEqual({
      error: "INVALID_CREDENTIALS",
    });
  });
});

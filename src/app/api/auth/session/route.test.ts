import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const revokeSessionMock = vi.fn();
const getAuthenticatedUserMock = vi.fn();

vi.mock("@/auth/session/session-service", () => ({
  SessionService: class {
    getSession = getSessionMock;
    revokeSession = revokeSessionMock;
  },
}));

vi.mock("@/auth/service/auth-service", () => ({
  AuthService: class {
    getAuthenticatedUser = getAuthenticatedUserMock;
  },
}));

import { GET } from "./route";

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    revokeSessionMock.mockReset();
    getAuthenticatedUserMock.mockReset();
  });

  it("returns null when no session cookie exists", async () => {
    const request = new Request("http://localhost/api/auth/session");

    const response = await GET(request);

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      user: null,
    });

    expect(getSessionMock).not.toHaveBeenCalled();
    expect(getAuthenticatedUserMock).not.toHaveBeenCalled();
  });

  it("returns the authenticated user for a valid session", async () => {
    getSessionMock.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
    });

    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    const request = new Request("http://localhost/api/auth/session", {
      headers: {
        cookie: "irtaki_session=session-token",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User",
      },
    });

    expect(getSessionMock).toHaveBeenCalledWith("session-token");
    expect(getAuthenticatedUserMock).toHaveBeenCalledWith("user-1");
  });

  it("returns null for an invalid or expired session", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new Request("http://localhost/api/auth/session", {
      headers: {
        cookie: "irtaki_session=invalid-token",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      user: null,
    });

    expect(getSessionMock).toHaveBeenCalledWith("invalid-token");
    expect(getAuthenticatedUserMock).not.toHaveBeenCalled();
  });

  it("revokes the session when the user no longer exists", async () => {
    getSessionMock.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
    });

    getAuthenticatedUserMock.mockResolvedValue(null);

    const request = new Request("http://localhost/api/auth/session", {
      headers: {
        cookie: "irtaki_session=session-token",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      user: null,
    });

    expect(revokeSessionMock).toHaveBeenCalledWith("session-token");
  });
});

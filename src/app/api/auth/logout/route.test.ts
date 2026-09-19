import { beforeEach, describe, expect, it, vi } from "vitest";

const revokeSessionMock = vi.fn();

vi.mock("@/auth/session/session-service", () => ({
  SessionService: class {
    revokeSession = revokeSessionMock;
  },
}));

import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    revokeSessionMock.mockReset();
  });

  it("revokes the current session and clears the cookie", async () => {
    revokeSessionMock.mockResolvedValue(undefined);

    const request = new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: {
        cookie: "irtaki_session=session-token",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(204);

    expect(revokeSessionMock).toHaveBeenCalledWith("session-token");

    const cookie = response.headers.get("set-cookie");

    expect(cookie).toContain("irtaki_session=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
  });

  it("clears the cookie even when no session exists", async () => {
    const request = new Request("http://localhost/api/auth/logout", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(204);

    expect(revokeSessionMock).not.toHaveBeenCalled();

    const cookie = response.headers.get("set-cookie");

    expect(cookie).toContain("irtaki_session=");
    expect(cookie).toContain("Max-Age=0");
  });
});

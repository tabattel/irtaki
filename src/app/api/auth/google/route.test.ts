import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthorizationUrlMock = vi.fn();

vi.mock("@/auth/google/google-auth-service", () => ({
  GoogleAuthService: class {
    getAuthorizationUrl = getAuthorizationUrlMock;
  },
}));

import { GET } from "./route";

describe("GET /api/auth/google", () => {
  beforeEach(() => {
    getAuthorizationUrlMock.mockReset();
  });

  it("redirects to Google and stores the OAuth state", async () => {
    getAuthorizationUrlMock.mockImplementation((state: string) => {
      return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`;
    });

    const response = await GET();

    expect(response.status).toBe(307);

    const location = response.headers.get("location");

    expect(location).toContain(
      "https://accounts.google.com/o/oauth2/v2/auth?state=",
    );

    const cookie = response.headers.get("set-cookie");

    expect(cookie).toContain("irtaki_google_state=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
  });

  it("returns 500 when Google OAuth is not configured", async () => {
    getAuthorizationUrlMock.mockImplementation(() => {
      throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
    });

    const response = await GET();

    expect(response.status).toBe(500);

    await expect(response.json()).resolves.toEqual({
      error: "GOOGLE_OAUTH_NOT_CONFIGURED",
    });
  });
});

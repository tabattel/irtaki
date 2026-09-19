import { beforeEach, describe, expect, it, vi } from "vitest";

const { listMock, createMock, getAuthenticatedUserMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  createMock: vi.fn(),
  getAuthenticatedUserMock: vi.fn(),
}));

vi.mock("@/auth/http/get-authenticated-user", () => ({
  getAuthenticatedUserFromRequest: getAuthenticatedUserMock,
}));

vi.mock("@/auth/child-profile/child-profile-service", () => ({
  ChildProfileService: class {
    list = listMock;
    create = createMock;
  },
}));

import { GET, POST } from "./route";

describe("/api/child-profiles", () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    getAuthenticatedUserMock.mockReset();
  });

  it("returns 401 when listing without authentication", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/child-profiles"),
    );

    expect(response.status).toBe(401);

    await expect(response.json()).resolves.toEqual({
      error: "UNAUTHORIZED",
    });
  });

  it("lists the authenticated user's profiles", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    listMock.mockResolvedValue([
      {
        id: "child-1",
        userId: "user-1",
        name: "Ahmed",
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/child-profiles"),
    );

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      profiles: [
        {
          id: "child-1",
          userId: "user-1",
          name: "Ahmed",
        },
      ],
    });

    expect(listMock).toHaveBeenCalledWith("user-1");
  });

  it("creates a profile for the authenticated user", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    createMock.mockResolvedValue({
      id: "child-1",
      userId: "user-1",
      name: "Ahmed",
    });

    const request = new Request("http://localhost/api/child-profiles", {
      method: "POST",
      body: JSON.stringify({
        name: "Ahmed",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(201);

    await expect(response.json()).resolves.toEqual({
      profile: {
        id: "child-1",
        userId: "user-1",
        name: "Ahmed",
      },
    });

    expect(createMock).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Ahmed",
    });
  });

  it("returns 400 for an invalid create request", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    const request = new Request("http://localhost/api/child-profiles", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error: "INVALID_REQUEST",
    });

    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty profile name", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    createMock.mockRejectedValue(new Error("INVALID_CHILD_PROFILE_NAME"));

    const request = new Request("http://localhost/api/child-profiles", {
      method: "POST",
      body: JSON.stringify({
        name: "   ",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error: "INVALID_CHILD_PROFILE_NAME",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, updateMock, deleteMock, getAuthenticatedUserMock } =
  vi.hoisted(() => ({
    getMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
    getAuthenticatedUserMock: vi.fn(),
  }));

vi.mock("@/auth/http/get-authenticated-user", () => ({
  getAuthenticatedUserFromRequest: getAuthenticatedUserMock,
}));

vi.mock("@/auth/child-profile/child-profile-service", () => ({
  ChildProfileService: class {
    get = getMock;
    update = updateMock;
    delete = deleteMock;
  },
}));

import { DELETE, GET, PATCH } from "./route";

const context = {
  params: Promise.resolve({
    id: "child-1",
  }),
};

describe("/api/child-profiles/[id]", () => {
  beforeEach(() => {
    getMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    getAuthenticatedUserMock.mockReset();
  });

  it("returns 401 without authentication", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/child-profiles/child-1"),
      context,
    );

    expect(response.status).toBe(401);

    await expect(response.json()).resolves.toEqual({
      error: "UNAUTHORIZED",
    });
  });

  it("returns a profile owned by the authenticated user", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    getMock.mockResolvedValue({
      id: "child-1",
      userId: "user-1",
      name: "Ahmed",
    });

    const response = await GET(
      new Request("http://localhost/api/child-profiles/child-1"),
      context,
    );

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      profile: {
        id: "child-1",
        userId: "user-1",
        name: "Ahmed",
      },
    });

    expect(getMock).toHaveBeenCalledWith({
      userId: "user-1",
      childProfileId: "child-1",
    });
  });

  it("returns 404 when the profile does not belong to the user", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    getMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/child-profiles/child-1"),
      context,
    );

    expect(response.status).toBe(404);

    await expect(response.json()).resolves.toEqual({
      error: "CHILD_PROFILE_NOT_FOUND",
    });
  });

  it("updates a profile", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    updateMock.mockResolvedValue({
      id: "child-1",
      userId: "user-1",
      name: "Omar",
    });

    const request = new Request("http://localhost/api/child-profiles/child-1", {
      method: "PATCH",
      body: JSON.stringify({
        name: "Omar",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await PATCH(request, context);

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      profile: {
        id: "child-1",
        userId: "user-1",
        name: "Omar",
      },
    });

    expect(updateMock).toHaveBeenCalledWith({
      userId: "user-1",
      childProfileId: "child-1",
      name: "Omar",
    });
  });

  it("deletes a profile", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    deleteMock.mockResolvedValue(undefined);

    const request = new Request("http://localhost/api/child-profiles/child-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, context);

    expect(response.status).toBe(204);

    expect(deleteMock).toHaveBeenCalledWith({
      userId: "user-1",
      childProfileId: "child-1",
    });
  });

  it("returns 404 when deleting a missing profile", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });

    deleteMock.mockRejectedValue(new Error("CHILD_PROFILE_NOT_FOUND"));

    const request = new Request("http://localhost/api/child-profiles/child-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, context);

    expect(response.status).toBe(404);

    await expect(response.json()).resolves.toEqual({
      error: "CHILD_PROFILE_NOT_FOUND",
    });
  });
});

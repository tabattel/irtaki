import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserFromRequest: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/auth/http/get-authenticated-user", () => ({
  getAuthenticatedUserFromRequest:
    mocks.getAuthenticatedUserFromRequest,
}));

vi.mock("@/annotation/annotation-service", () => ({
  AnnotationService: class {
    get = mocks.get;
    update = mocks.update;
    delete = mocks.delete;
  },
}));

import { DELETE, GET, PATCH } from "./route";

const context = {
  params: Promise.resolve({ id: "annotation-1" }),
};

describe("/api/annotations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated GET", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/annotations/annotation-1"),
      context,
    );

    expect(response.status).toBe(401);
  });

  it("gets an owned annotation", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({
      id: "user-1",
    });
    mocks.get.mockResolvedValue({
      id: "annotation-1",
      userId: "user-1",
      ayahId: 1,
      content: "Note",
    });

    const response = await GET(
      new Request("http://localhost/api/annotations/annotation-1"),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.get).toHaveBeenCalledWith({
      userId: "user-1",
      annotationId: "annotation-1",
    });
  });

  it("returns 404 for an inaccessible annotation", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({
      id: "user-2",
    });
    mocks.get.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/annotations/annotation-1"),
      context,
    );

    expect(response.status).toBe(404);
  });

  it("prevents another user from updating an annotation", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({
      id: "user-2",
    });
    mocks.update.mockRejectedValue(
      new Error("ANNOTATION_NOT_FOUND"),
    );

    const response = await PATCH(
      new Request("http://localhost/api/annotations/annotation-1", {
        method: "PATCH",
        body: JSON.stringify({
          content: "Malicious update",
        }),
      }),
      context,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "ANNOTATION_NOT_FOUND",
    });
  });

  it("updates an annotation", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({
      id: "user-1",
    });
    mocks.update.mockResolvedValue({
      id: "annotation-1",
      userId: "user-1",
      ayahId: 1,
      content: "Updated",
    });

    const response = await PATCH(
      new Request("http://localhost/api/annotations/annotation-1", {
        method: "PATCH",
        body: JSON.stringify({
          content: "Updated",
        }),
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      userId: "user-1",
      annotationId: "annotation-1",
      content: "Updated",
    });
  });

  it("deletes an annotation", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({
      id: "user-1",
    });
    mocks.delete.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost/api/annotations/annotation-1", {
        method: "DELETE",
      }),
      context,
    );

    expect(response.status).toBe(204);
    expect(mocks.delete).toHaveBeenCalledWith({
      userId: "user-1",
      annotationId: "annotation-1",
    });
  });
});

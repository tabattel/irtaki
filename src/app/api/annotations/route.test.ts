import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserFromRequest: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/auth/http/get-authenticated-user", () => ({
  getAuthenticatedUserFromRequest:
    mocks.getAuthenticatedUserFromRequest,
}));

vi.mock("@/annotation/annotation-service", () => ({
  AnnotationService: class {
    list = mocks.list;
    create = mocks.create;
  },
}));

import { GET, POST } from "./route";

describe("GET /api/annotations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/annotations"));

    expect(response.status).toBe(401);
  });

  it("lists annotations for the authenticated user", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({
      id: "user-1",
    });
    mocks.list.mockResolvedValue([
      {
        id: "annotation-1",
        userId: "user-1",
        ayahId: 1,
        content: "Note",
      },
    ]);

    const response = await GET(new Request("http://localhost/api/annotations"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: "annotation-1",
        userId: "user-1",
        ayahId: 1,
        content: "Note",
      },
    ]);
    expect(mocks.list).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/annotations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/annotations", {
        method: "POST",
        body: JSON.stringify({
          ayahId: 1,
          content: "Note",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("creates an annotation", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({
      id: "user-1",
    });
    mocks.create.mockResolvedValue({
      id: "annotation-1",
      userId: "user-1",
      ayahId: 1,
      content: "Note",
    });

    const response = await POST(
      new Request("http://localhost/api/annotations", {
        method: "POST",
        body: JSON.stringify({
          ayahId: 1,
          content: "Note",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: "annotation-1",
      userId: "user-1",
      ayahId: 1,
      content: "Note",
    });

    expect(mocks.create).toHaveBeenCalledWith({
      userId: "user-1",
      ayahId: 1,
      content: "Note",
    });
  });

  it("rejects invalid input", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({
      id: "user-1",
    });

    const response = await POST(
      new Request("http://localhost/api/annotations", {
        method: "POST",
        body: JSON.stringify({
          ayahId: "1",
          content: "Note",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "INVALID_ANNOTATION_INPUT",
    });
  });
});

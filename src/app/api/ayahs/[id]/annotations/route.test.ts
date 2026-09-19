import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserFromRequest: vi.fn(),
  listByAyah: vi.fn(),
}));

vi.mock("@/auth/http/get-authenticated-user", () => ({
  getAuthenticatedUserFromRequest:
    mocks.getAuthenticatedUserFromRequest,
}));

vi.mock("@/annotation/annotation-service", () => ({
  AnnotationService: class {
    listByAyah = mocks.listByAyah;
  },
}));

import { GET } from "./route";

describe("GET /api/ayahs/[id]/annotations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/ayahs/1/annotations"),
      {
        params: Promise.resolve({ id: "1" }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("lists annotations for the authenticated user and ayah", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({
      id: "user-1",
    });
    mocks.listByAyah.mockResolvedValue([
      {
        id: "annotation-1",
        userId: "user-1",
        ayahId: 1,
        content: "Note",
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/ayahs/1/annotations"),
      {
        params: Promise.resolve({ id: "1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(1);
    expect(mocks.listByAyah).toHaveBeenCalledWith({
      userId: "user-1",
      ayahId: 1,
    });
  });

  it("rejects an invalid ayah id", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({
      id: "user-1",
    });

    const response = await GET(
      new Request("http://localhost/api/ayahs/abc/annotations"),
      {
        params: Promise.resolve({ id: "abc" }),
      },
    );

    expect(response.status).toBe(400);
  });
});

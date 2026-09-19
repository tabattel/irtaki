import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChildProfileService } from "./child-profile-service";

describe("ChildProfileService", () => {
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    findManyByUserId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  let service: ChildProfileService;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new ChildProfileService(repository as never);
  });

  it("creates a child profile with a trimmed name", async () => {
    repository.create.mockResolvedValue({
      id: "child-1",
      userId: "user-1",
      name: "Ahmed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      userId: "user-1",
      name: "  Ahmed  ",
    });

    expect(repository.create).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Ahmed",
    });

    expect(result.name).toBe("Ahmed");
  });

  it("rejects an empty name", async () => {
    await expect(
      service.create({
        userId: "user-1",
        name: "   ",
      }),
    ).rejects.toThrow("INVALID_CHILD_PROFILE_NAME");

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("lists profiles for the authenticated user", async () => {
    repository.findManyByUserId.mockResolvedValue([]);

    await service.list("user-1");

    expect(repository.findManyByUserId).toHaveBeenCalledWith("user-1");
  });

  it("gets a profile only for the authenticated user", async () => {
    repository.findById.mockResolvedValue({
      id: "child-1",
      userId: "user-1",
      name: "Ahmed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.get({
      userId: "user-1",
      childProfileId: "child-1",
    });

    expect(repository.findById).toHaveBeenCalledWith("child-1", "user-1");

    expect(result?.id).toBe("child-1");
  });

  it("updates a profile owned by the authenticated user", async () => {
    repository.findById.mockResolvedValue({
      id: "child-1",
      userId: "user-1",
      name: "Ahmed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    repository.update.mockResolvedValue({
      id: "child-1",
      userId: "user-1",
      name: "Omar",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update({
      userId: "user-1",
      childProfileId: "child-1",
      name: " Omar ",
    });

    expect(repository.update).toHaveBeenCalledWith("child-1", "user-1", {
      name: "Omar",
    });

    expect(result.name).toBe("Omar");
  });

  it("rejects updating a profile that does not belong to the user", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.update({
        userId: "user-1",
        childProfileId: "child-2",
        name: "Omar",
      }),
    ).rejects.toThrow("CHILD_PROFILE_NOT_FOUND");

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("deletes a profile owned by the authenticated user", async () => {
    repository.findById.mockResolvedValue({
      id: "child-1",
      userId: "user-1",
      name: "Ahmed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.delete({
      userId: "user-1",
      childProfileId: "child-1",
    });

    expect(repository.delete).toHaveBeenCalledWith("child-1", "user-1");
  });

  it("rejects deleting a profile that does not belong to the user", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.delete({
        userId: "user-1",
        childProfileId: "child-2",
      }),
    ).rejects.toThrow("CHILD_PROFILE_NOT_FOUND");

    expect(repository.delete).not.toHaveBeenCalled();
  });
});

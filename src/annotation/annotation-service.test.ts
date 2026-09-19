import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnnotationService } from "./annotation-service";

describe("AnnotationService", () => {
  const annotationRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByUserAndAyah: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const ayahRepository = {
    findById: vi.fn(),
  };

  let service: AnnotationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnnotationService(
      annotationRepository as never,
      ayahRepository as never,
    );
  });

  it("creates an annotation with trimmed content", async () => {
    ayahRepository.findById.mockResolvedValue({ id: 42 });

    annotationRepository.create.mockResolvedValue({
      id: "annotation-1",
      userId: "user-1",
      ayahId: 42,
      content: "My note",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      userId: "user-1",
      ayahId: 42,
      content: "  My note  ",
    });

    expect(ayahRepository.findById).toHaveBeenCalledWith(42);
    expect(annotationRepository.create).toHaveBeenCalledWith(
      "user-1",
      42,
      "My note",
    );
    expect(result.content).toBe("My note");
  });

  it("rejects empty annotation content", async () => {
    await expect(
      service.create({
        userId: "user-1",
        ayahId: 42,
        content: "   ",
      }),
    ).rejects.toThrow("INVALID_ANNOTATION_CONTENT");

    expect(ayahRepository.findById).not.toHaveBeenCalled();
    expect(annotationRepository.create).not.toHaveBeenCalled();
  });

  it("rejects an annotation for an unknown ayah", async () => {
    ayahRepository.findById.mockResolvedValue(null);

    await expect(
      service.create({
        userId: "user-1",
        ayahId: 999999,
        content: "My note",
      }),
    ).rejects.toThrow("AYAH_NOT_FOUND");

    expect(annotationRepository.create).not.toHaveBeenCalled();
  });

  it("lists annotations for the authenticated user", async () => {
    annotationRepository.findByUserId.mockResolvedValue([]);

    const result = await service.list("user-1");

    expect(result).toEqual([]);
    expect(annotationRepository.findByUserId).toHaveBeenCalledWith("user-1");
  });

  it("lists annotations for one ayah and the authenticated user", async () => {
    annotationRepository.findByUserAndAyah.mockResolvedValue([]);

    await service.listByAyah({
      userId: "user-1",
      ayahId: 42,
    });

    expect(annotationRepository.findByUserAndAyah).toHaveBeenCalledWith(
      "user-1",
      42,
    );
  });

  it("gets an annotation only for the authenticated user", async () => {
    annotationRepository.findById.mockResolvedValue({
      id: "annotation-1",
      userId: "user-1",
      ayahId: 42,
      content: "My note",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.get({
      userId: "user-1",
      annotationId: "annotation-1",
    });

    expect(result?.id).toBe("annotation-1");
    expect(annotationRepository.findById).toHaveBeenCalledWith(
      "annotation-1",
      "user-1",
    );
  });

  it("updates an annotation owned by the authenticated user", async () => {
    annotationRepository.findById.mockResolvedValue({
      id: "annotation-1",
      userId: "user-1",
      ayahId: 42,
      content: "Old note",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    annotationRepository.update.mockResolvedValue({
      id: "annotation-1",
      userId: "user-1",
      ayahId: 42,
      content: "New note",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update({
      userId: "user-1",
      annotationId: "annotation-1",
      content: "  New note  ",
    });

    expect(annotationRepository.update).toHaveBeenCalledWith(
      "annotation-1",
      "user-1",
      "New note",
    );
    expect(result.content).toBe("New note");
  });

  it("rejects updating another user's annotation", async () => {
    annotationRepository.findById.mockResolvedValue(null);

    await expect(
      service.update({
        userId: "user-2",
        annotationId: "annotation-1",
        content: "New note",
      }),
    ).rejects.toThrow("ANNOTATION_NOT_FOUND");

    expect(annotationRepository.update).not.toHaveBeenCalled();
  });

  it("rejects empty content when updating", async () => {
    await expect(
      service.update({
        userId: "user-1",
        annotationId: "annotation-1",
        content: "   ",
      }),
    ).rejects.toThrow("INVALID_ANNOTATION_CONTENT");

    expect(annotationRepository.findById).not.toHaveBeenCalled();
    expect(annotationRepository.update).not.toHaveBeenCalled();
  });

  it("deletes an annotation owned by the authenticated user", async () => {
    annotationRepository.findById.mockResolvedValue({
      id: "annotation-1",
      userId: "user-1",
      ayahId: 42,
      content: "My note",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    annotationRepository.delete.mockResolvedValue(true);

    await service.delete({
      userId: "user-1",
      annotationId: "annotation-1",
    });

    expect(annotationRepository.delete).toHaveBeenCalledWith(
      "annotation-1",
      "user-1",
    );
  });

  it("rejects deleting another user's annotation", async () => {
    annotationRepository.findById.mockResolvedValue(null);

    await expect(
      service.delete({
        userId: "user-2",
        annotationId: "annotation-1",
      }),
    ).rejects.toThrow("ANNOTATION_NOT_FOUND");

    expect(annotationRepository.delete).not.toHaveBeenCalled();
  });
});

import {
  AnnotationRepository,
  AyahRepository,
} from "@irtaki/persistence";

export type Annotation = {
  id: string;
  userId: string;
  ayahId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export class AnnotationService {
  constructor(
    private readonly annotationRepository = new AnnotationRepository(),
    private readonly ayahRepository = new AyahRepository(),
  ) {}

  async create(input: {
    userId: string;
    ayahId: number;
    content: string;
  }): Promise<Annotation> {
    const content = input.content.trim();

    if (!content) {
      throw new Error("INVALID_ANNOTATION_CONTENT");
    }

    const ayah = await this.ayahRepository.findById(input.ayahId);

    if (!ayah) {
      throw new Error("AYAH_NOT_FOUND");
    }

    return this.annotationRepository.create(
      input.userId,
      input.ayahId,
      content,
    );
  }

  async list(userId: string): Promise<Annotation[]> {
    return this.annotationRepository.findByUserId(userId);
  }

  async listByAyah(input: {
    userId: string;
    ayahId: number;
  }): Promise<Annotation[]> {
    return this.annotationRepository.findByUserAndAyah(
      input.userId,
      input.ayahId,
    );
  }

  async get(input: {
    userId: string;
    annotationId: string;
  }): Promise<Annotation | null> {
    return this.annotationRepository.findById(
      input.annotationId,
      input.userId,
    );
  }

  async update(input: {
    userId: string;
    annotationId: string;
    content: string;
  }): Promise<Annotation> {
    const content = input.content.trim();

    if (!content) {
      throw new Error("INVALID_ANNOTATION_CONTENT");
    }

    const existing = await this.get({
      userId: input.userId,
      annotationId: input.annotationId,
    });

    if (!existing) {
      throw new Error("ANNOTATION_NOT_FOUND");
    }

    const updated = await this.annotationRepository.update(
      input.annotationId,
      input.userId,
      content,
    );

    if (!updated) {
      throw new Error("ANNOTATION_NOT_FOUND");
    }

    return updated;
  }

  async delete(input: {
    userId: string;
    annotationId: string;
  }): Promise<void> {
    const existing = await this.get({
      userId: input.userId,
      annotationId: input.annotationId,
    });

    if (!existing) {
      throw new Error("ANNOTATION_NOT_FOUND");
    }

    const deleted = await this.annotationRepository.delete(
      input.annotationId,
      input.userId,
    );

    if (!deleted) {
      throw new Error("ANNOTATION_NOT_FOUND");
    }
  }
}

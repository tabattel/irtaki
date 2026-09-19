import { ChildProfileRepository } from "@irtaki/persistence";

export type ChildProfile = {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export class ChildProfileService {
  constructor(
    private readonly childProfileRepository = new ChildProfileRepository(),
  ) {}

  async create(input: { userId: string; name: string }): Promise<ChildProfile> {
    const name = input.name.trim();

    if (!name) {
      throw new Error("INVALID_CHILD_PROFILE_NAME");
    }

    return this.childProfileRepository.create({
      userId: input.userId,
      name,
    });
  }

  async list(userId: string): Promise<ChildProfile[]> {
    return this.childProfileRepository.findManyByUserId(userId);
  }

  async get(input: {
    userId: string;
    childProfileId: string;
  }): Promise<ChildProfile | null> {
    return this.childProfileRepository.findById(
      input.childProfileId,
      input.userId,
    );
  }

  async update(input: {
    userId: string;
    childProfileId: string;
    name: string;
  }): Promise<ChildProfile> {
    const name = input.name.trim();

    if (!name) {
      throw new Error("INVALID_CHILD_PROFILE_NAME");
    }

    const existing = await this.get({
      userId: input.userId,
      childProfileId: input.childProfileId,
    });

    if (!existing) {
      throw new Error("CHILD_PROFILE_NOT_FOUND");
    }

    return this.childProfileRepository.update(
      input.childProfileId,
      input.userId,
      { name },
    );
  }

  async delete(input: {
    userId: string;
    childProfileId: string;
  }): Promise<void> {
    const existing = await this.get({
      userId: input.userId,
      childProfileId: input.childProfileId,
    });

    if (!existing) {
      throw new Error("CHILD_PROFILE_NOT_FOUND");
    }

    await this.childProfileRepository.delete(
      input.childProfileId,
      input.userId,
    );
  }
}

import { ChildProfileRepository, LearnerRepository } from "@irtaki/persistence";

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
    private readonly learnerRepository = new LearnerRepository(),
  ) {}

  async create(input: { userId: string; name: string }): Promise<ChildProfile> {
    const name = input.name.trim();

    if (!name) {
      throw new Error("INVALID_CHILD_PROFILE_NAME");
    }

    const profile = await this.childProfileRepository.create({
      userId: input.userId,
      name,
    });

    await this.ensureLearnerForChildProfile(profile);

    return profile;
  }

  private async ensureLearnerForChildProfile(
    profile: ChildProfile,
  ): Promise<void> {
    const existing = await this.learnerRepository.findByChildProfileId(
      profile.id,
      profile.userId,
    );

    if (existing) {
      if (existing.name !== profile.name) {
        await this.learnerRepository.update(existing.id, profile.userId, {
          name: profile.name,
        });
      }
      return;
    }

    try {
      await this.learnerRepository.create({
        userId: profile.userId,
        childProfileId: profile.id,
        name: profile.name,
      });
    } catch (error) {
      // childProfileId est unique. Ne tolérer une course concurrente
      // que si un autre appel a effectivement créé le lien.
      const concurrent = await this.learnerRepository.findByChildProfileId(
        profile.id,
        profile.userId,
      );

      if (!concurrent) {
        throw error;
      }
    }
  }

  async list(userId: string): Promise<ChildProfile[]> {
    const profiles = await this.childProfileRepository.findManyByUserId(userId);

    for (const profile of profiles) {
      await this.ensureLearnerForChildProfile(profile);
    }

    return profiles;
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

    const updated = await this.childProfileRepository.update(
      input.childProfileId,
      input.userId,
      { name },
    );

    await this.ensureLearnerForChildProfile(updated);

    return updated;
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

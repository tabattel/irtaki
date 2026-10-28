import { prisma } from "../client/prisma";
import type {
  LearnerPreference as LearnerPreferenceRecord,
  Prisma,
} from "../generated/client";

export class LearnerPreferenceRepository {
  findByLearnerId(learnerId: string): Promise<LearnerPreferenceRecord | null> {
    return prisma.learnerPreference.findUnique({
      where: { learnerId },
    });
  }

  upsert(
    learnerId: string,
    preferences: Record<string, string>,
  ): Promise<LearnerPreferenceRecord> {
    const json = JSON.parse(
      JSON.stringify(preferences),
    ) as Prisma.InputJsonValue;

    return prisma.learnerPreference.upsert({
      where: { learnerId },
      create: {
        learnerId,
        preferences: json,
      },
      update: {
        preferences: json,
      },
    });
  }
}

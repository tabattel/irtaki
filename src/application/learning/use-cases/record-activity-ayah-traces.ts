import type { LearningActivityAyahTraceStatus } from "../types";

export type RecordActivityAyahTracesInput = {
  learnerId: string;
  activityId: string;
  ayahIds: number[];
};

export type RecordActivityAyahTracesDependencies = {
  learnerRepository: {
    findById(id: string, userId: string): Promise<unknown | null>;
  };
  activityRepository: {
    findById(id: string, learnerId: string): Promise<unknown | null>;
  };
  activityAyahTraceRepository: {
    findUnknownAyahIds(ayahIds: number[]): Promise<number[]>;
    createForActivity(input: {
      activityId: string;
      ayahIds: number[];
      status: LearningActivityAyahTraceStatus;
      recordedAt: Date | null;
    }): Promise<number>;
  };
};

export async function recordActivityAyahTraces(
  userId: string,
  input: RecordActivityAyahTracesInput,
  dependencies: RecordActivityAyahTracesDependencies,
): Promise<{
  activityId: string;
  ayahIds: number[];
  createdCount: number;
  status: "started";
}> {
  if (userId.trim().length === 0) {
    throw new Error("User id is required");
  }

  if (input.learnerId.trim().length === 0) {
    throw new Error("Learner id is required");
  }

  if (input.activityId.trim().length === 0) {
    throw new Error("Activity id is required");
  }

  if (
    !Array.isArray(input.ayahIds) ||
    input.ayahIds.length === 0 ||
    input.ayahIds.length > 6236 ||
    !input.ayahIds.every((id) => Number.isInteger(id) && id > 0)
  ) {
    throw new Error("Ayah ids must contain valid positive integers");
  }

  if (new Set(input.ayahIds).size !== input.ayahIds.length) {
    throw new Error("Duplicate ayah ids are not allowed");
  }

  const learner = await dependencies.learnerRepository.findById(
    input.learnerId,
    userId,
  );

  if (learner === null) {
    throw new Error("Learner not found");
  }

  const activity = await dependencies.activityRepository.findById(
    input.activityId,
    input.learnerId,
  );

  if (activity === null) {
    throw new Error("Activity not found");
  }

  const unknownAyahIds =
    await dependencies.activityAyahTraceRepository.findUnknownAyahIds(
      input.ayahIds,
    );

  if (unknownAyahIds.length > 0) {
    throw new Error(`Ayah not found: ${unknownAyahIds.join(", ")}`);
  }

  const createdCount =
    await dependencies.activityAyahTraceRepository.createForActivity({
      activityId: input.activityId,
      ayahIds: input.ayahIds,
      status: "started",
      recordedAt: null,
    });

  return {
    activityId: input.activityId,
    ayahIds: input.ayahIds,
    createdCount,
    status: "started",
  };
}

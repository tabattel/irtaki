import type { LearningActivityAyahTraceStatus } from "../types";

export type RecordActivityAyahTracesInput = {
  learnerId: string;
  activityId: string;
  ayahIds: number[];
  lineNumbersByAyah?: Record<string, number[]>;
  pageLineCount?: number;
  pageNumber?: number;
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
      lineNumbersByAyah?: Record<string, number[]>;
      pageLineCount?: number;
      pageNumber?: number;
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

  const hasAnyPageMetadata =
    input.lineNumbersByAyah !== undefined ||
    input.pageLineCount !== undefined ||
    input.pageNumber !== undefined;

  if (hasAnyPageMetadata) {
    const lineMap = input.lineNumbersByAyah;
    const pageLineCount = input.pageLineCount;
    const pageNumber = input.pageNumber;

    if (
      lineMap === undefined ||
      typeof pageLineCount !== "number" ||
      !Number.isInteger(pageLineCount) ||
      pageLineCount < 1 ||
      pageLineCount > 100 ||
      typeof pageNumber !== "number" ||
      !Number.isInteger(pageNumber) ||
      pageNumber < 1
    ) {
      throw new Error("Invalid page line metadata");
    }

    const keys = Object.keys(lineMap);
    const expectedKeys = input.ayahIds.map(String).sort();
    const actualKeys = [...keys].sort();

    const validKeys =
      keys.length === expectedKeys.length &&
      actualKeys.every((key, index) => key === expectedKeys[index]);

    const validLines = input.ayahIds.every((ayahId) => {
      const lines = lineMap[String(ayahId)];

      return (
        Array.isArray(lines) &&
        lines.length > 0 &&
        lines.every(
          (line) =>
            Number.isInteger(line) &&
            line > 0 &&
            line <= pageLineCount
        )
      );
    });

    if (!validKeys || !validLines) {
      throw new Error("Invalid page line metadata");
    }
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
      ...(hasAnyPageMetadata
        ? {
            lineNumbersByAyah: input.lineNumbersByAyah,
            pageLineCount: input.pageLineCount,
            pageNumber: input.pageNumber,
          }
        : {}),
    });

  return {
    activityId: input.activityId,
    ayahIds: input.ayahIds,
    createdCount,
    status: "started",
  };
}

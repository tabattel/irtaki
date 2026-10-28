import type { LearningActivityAyahTraceStatus } from "../types";

export type FinalActivityStatus =
  "completed" | "partial" | "failed" | "skipped";

export type FinishActivityInput = {
  learnerId: string;
  activityId: string;
  status: FinalActivityStatus;
};

export type FinishActivityDependencies = {
  learnerRepository: {
    findById(id: string, userId: string): Promise<unknown | null>;
  };
  activityRepository: {
    findById(
      id: string,
      learnerId: string,
    ): Promise<{
      id: string;
      startedAt: Date;
      endedAt: Date | null;
    } | null>;
    update(
      id: string,
      learnerId: string,
      input: { endedAt: Date; durationSec: number },
    ): Promise<unknown>;
  };
  activityAyahTraceRepository: {
    updateStatusesByActivityId(
      activityId: string,
      status: LearningActivityAyahTraceStatus,
      recordedAt: Date,
    ): Promise<number>;
  };
};

export async function finishActivity(
  userId: string,
  input: FinishActivityInput,
  dependencies: FinishActivityDependencies,
  endedAt = new Date(),
) {
  if (!userId.trim()) throw new Error("User id is required");
  if (!input.learnerId.trim()) throw new Error("Learner id is required");
  if (!input.activityId.trim()) throw new Error("Activity id is required");
  if (Number.isNaN(endedAt.getTime())) {
    throw new Error("Activity endedAt is invalid");
  }

  const learner = await dependencies.learnerRepository.findById(
    input.learnerId,
    userId,
  );
  if (learner === null) throw new Error("Learner not found");

  const activity = await dependencies.activityRepository.findById(
    input.activityId,
    input.learnerId,
  );
  if (activity === null) throw new Error("Activity not found");
  if (activity.endedAt !== null) {
    throw new Error("Activity is already finished");
  }
  if (endedAt < activity.startedAt) {
    throw new Error("Activity endedAt must be after startedAt");
  }

  const durationSec = Math.floor(
    (endedAt.getTime() - activity.startedAt.getTime()) / 1000,
  );

  await dependencies.activityRepository.update(activity.id, input.learnerId, {
    endedAt,
    durationSec,
  });

  const updatedTraceCount =
    await dependencies.activityAyahTraceRepository.updateStatusesByActivityId(
      activity.id,
      input.status,
      endedAt,
    );

  return {
    activityId: activity.id,
    learnerId: input.learnerId,
    status: input.status,
    endedAt: endedAt.toISOString(),
    durationSec,
    updatedTraceCount,
  };
}

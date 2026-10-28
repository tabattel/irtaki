import { prisma } from "../client/prisma";

export type ActivityTraceStatus =
  "started" | "completed" | "partial" | "failed" | "skipped";

export type TrackedActivityAction =
  | "read"
  | "listen"
  | "recite"
  | "memorize"
  | "revise"
  | "tajwid"
  | "tadabbur"
  | "talkin"
  | "tathbit";

export class ActivityAyahTraceRepository {
  async findUnknownAyahIds(ayahIds: number[]): Promise<number[]> {
    const uniqueIds = [...new Set(ayahIds)];

    if (uniqueIds.length === 0) return [];

    const existing = await prisma.ayah.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((ayah) => ayah.id));

    return uniqueIds.filter((id) => !existingIds.has(id));
  }

  async createForActivity(input: {
    activityId: string;
    ayahIds: number[];
    status?: ActivityTraceStatus;
    recordedAt?: Date | null;
  }): Promise<number> {
    const ayahIds = [...new Set(input.ayahIds)];

    if (ayahIds.length === 0) return 0;

    const result = await prisma.activityAyahTrace.createMany({
      data: ayahIds.map((ayahId) => ({
        activityId: input.activityId,
        ayahId,
        status: input.status ?? "started",
        recordedAt: input.recordedAt ?? null,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }

  async findManyByLearnerId(learnerId: string, action?: TrackedActivityAction) {
    return prisma.activityAyahTrace.findMany({
      where: {
        activity: {
          is: {
            learnerId,
            ...(action ? { action } : {}),
          },
        },
      },
      select: {
        id: true,
        activityId: true,
        ayahId: true,
        status: true,
        recordedAt: true,
        createdAt: true,
        activity: {
          select: {
            action: true,
            startedAt: true,
            endedAt: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  }

  async updateStatusesByActivityId(
    activityId: string,
    status: ActivityTraceStatus,
    recordedAt: Date,
  ): Promise<number> {
    const result = await prisma.activityAyahTrace.updateMany({
      where: { activityId },
      data: { status, recordedAt },
    });

    return result.count;
  }

  async findCompletedByLearnerIdForSurah(
    learnerId: string,
    surahNumber: number,
  ) {
    const traces = await prisma.activityAyahTrace.findMany({
      where: {
        activity: {
          is: {
            learnerId,
          },
        },
        ayah: {
          is: {
            surahNumber,
          },
        },
        OR: [
          {
            status: {
              in: ["completed", "partial"],
            },
          },
          {
            activity: {
              is: {
                result: {
                  is: {
                    status: {
                      in: ["completed", "partial"],
                    },
                  },
                },
              },
            },
          },
        ],
      },
      select: {
        activityId: true,
        ayahId: true,
        recordedAt: true,
        activity: {
          select: {
            action: true,
            startedAt: true,
            endedAt: true,
            result: {
              select: {
                createdAt: true,
              },
            },
          },
        },
        ayah: {
          select: {
            number: true,
            pageNumber: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return traces.map((trace) => ({
      activityId: trace.activityId,
      ayahId: trace.ayahId,
      ayahNumber: trace.ayah.number,
      pageNumber: trace.ayah.pageNumber,
      action: trace.activity.action,
      recordedAt: trace.recordedAt,
      startedAt: trace.activity.startedAt,
      endedAt: trace.activity.endedAt,
      resultCreatedAt: trace.activity.result?.createdAt ?? null,
    }));
  }

  async findHistoryByLearnerId(learnerId: string) {
    const traces = await prisma.activityAyahTrace.findMany({
      where: {
        activity: {
          is: {
            learnerId,
          },
        },
      },
      select: {
        activityId: true,
        ayahId: true,
        status: true,
        recordedAt: true,
        activity: {
          select: {
            action: true,
            startedAt: true,
            endedAt: true,
            result: {
              select: {
                createdAt: true,
              },
            },
          },
        },
        ayah: {
          select: {
            number: true,
            surahNumber: true,
            pageNumber: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return traces.map((trace) => ({
      activityId: trace.activityId,
      ayahId: trace.ayahId,
      status: trace.status,
      recordedAt: trace.recordedAt,
      startedAt: trace.activity.startedAt,
      endedAt: trace.activity.endedAt,
      resultCreatedAt: trace.activity.result?.createdAt ?? null,
      action: trace.activity.action,
      ayahNumber: trace.ayah.number,
      surahNumber: trace.ayah.surahNumber,
      pageNumber: trace.ayah.pageNumber,
    }));
  }
}

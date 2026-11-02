import { prisma } from "../client/prisma";

export class StatisticsRepository {
  async findActivitiesByLearnerIdInRange(
    learnerId: string,
    startAt: Date,
    endAt: Date,
  ) {
    return prisma.activity.findMany({
      where: {
        learnerId,
        startedAt: {
          gte: startAt,
          lt: endAt,
        },
      },
      select: {
        id: true,
        action: true,
        startedAt: true,
        endedAt: true,
        durationSec: true,
        result: {
          select: {
            status: true,
          },
        },
      },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    });
  }

  /**
   * La date effective d'une trace suit exactement la priorité de l'historique :
   * recordedAt, endedAt, result.createdAt, puis startedAt.
   *
   * Les branches OR reproduisent cette priorité en base afin d'éviter
   * de charger tout l'historique du profil dans l'application.
   */
  async findAyahTracesByLearnerIdInRange(
    learnerId: string,
    startAt: Date,
    endAt: Date,
  ) {
    return prisma.activityAyahTrace.findMany({
      where: {
        activity: {
          is: {
            learnerId,
          },
        },
        OR: [
          {
            recordedAt: {
              gte: startAt,
              lt: endAt,
            },
          },
          {
            recordedAt: null,
            activity: {
              is: {
                endedAt: {
                  gte: startAt,
                  lt: endAt,
                },
              },
            },
          },
          {
            recordedAt: null,
            activity: {
              is: {
                endedAt: null,
                result: {
                  is: {
                    createdAt: {
                      gte: startAt,
                      lt: endAt,
                    },
                  },
                },
              },
            },
          },
          {
            recordedAt: null,
            activity: {
              is: {
                endedAt: null,
                result: {
                  is: null,
                },
                startedAt: {
                  gte: startAt,
                  lt: endAt,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        activityId: true,
        ayahId: true,
        status: true,
        recordedAt: true,
        mushafPageNumber: true,
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
            juz: true,
            hizb: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  }
}

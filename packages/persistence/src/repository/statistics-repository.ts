import { prisma } from "../client/prisma";

export class StatisticsRepository {
  async findActivitiesByLearnerIdInRange(
    learnerId: string,
    startAt: Date,
    endAt: Date,
    filters?: { riwayaId?: number; tariqId?: number; wajhId?: number },
  ) {
    return prisma.activity.findMany({
      where: {
        learnerId,
        startedAt: {
          gte: startAt,
          lt: endAt,
        },
        ...(filters?.riwayaId !== undefined ? { riwayaId: filters.riwayaId } : {}),
        ...(filters?.tariqId !== undefined ? { tariqId: filters.tariqId } : {}),
        ...(filters?.wajhId !== undefined ? { wajhId: filters.wajhId } : {}),
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
    filters?: { riwayaId?: number; tariqId?: number; wajhId?: number },
  ) {
    return prisma.activityAyahTrace.findMany({
      where: {
        activity: {
          is: {
            learnerId,
            ...(filters?.riwayaId !== undefined ? { riwayaId: filters.riwayaId } : {}),
            ...(filters?.tariqId !== undefined ? { tariqId: filters.tariqId } : {}),
            ...(filters?.wajhId !== undefined ? { wajhId: filters.wajhId } : {}),
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
            riwayaId: true,
            tariqId: true,
            wajhId: true,
            riwaya: { select: { id: true, shortName: true, fullName: true } },
            tariq: { select: { id: true, name: true } },
            wajh: { select: { id: true, name: true } },
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

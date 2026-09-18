import { QIRAAT, RIWAYAT } from "@irtaki/domain";
import { prisma } from "../client/prisma";

export async function importQuranDomain(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const qiraa of QIRAAT) {
      await tx.qiraa.upsert({
        where: { id: qiraa.id },
        update: {
          shortName: qiraa.shortName,
          fullName: qiraa.fullName,
          region: qiraa.region,
        },
        create: {
          id: qiraa.id,
          shortName: qiraa.shortName,
          fullName: qiraa.fullName,
          region: qiraa.region,
        },
      });
    }

    for (const riwaya of RIWAYAT) {
      await tx.riwaya.upsert({
        where: { id: riwaya.id },
        update: {
          shortName: riwaya.shortName,
          fullName: riwaya.fullName,
          qiraaId: riwaya.qiraaId,
        },
        create: {
          id: riwaya.id,
          shortName: riwaya.shortName,
          fullName: riwaya.fullName,
          qiraaId: riwaya.qiraaId,
        },
      });

      for (const tariq of riwaya.tariqs) {
        await tx.tariq.upsert({
          where: { id: tariq.id },
          update: {
            name: tariq.name,
            riwayaId: riwaya.id,
          },
          create: {
            id: tariq.id,
            name: tariq.name,
            riwayaId: riwaya.id,
          },
        });
      }
    }
  });
}

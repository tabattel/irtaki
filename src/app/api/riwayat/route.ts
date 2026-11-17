import { NextResponse } from "next/server";
import { RiwayaRepository } from "@irtaki/persistence";

export async function GET() {
  const repo = new RiwayaRepository();
  const riwayat = await repo.findAllWithTuruqCount();
  return NextResponse.json({
    data: riwayat.map((r) => ({
      id: r.id,
      shortName: r.shortName,
      fullName: r.fullName,
      turuqCount: r._count.tariqs,
    })),
  });
}

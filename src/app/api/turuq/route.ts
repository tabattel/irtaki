import { NextResponse } from "next/server";
import { TariqRepository } from "@irtaki/persistence";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = url.searchParams.get("riwayaId");

  const repo = new TariqRepository();

  if (p !== null) {
    const riwayaId = Number(p);
    if (!Number.isInteger(riwayaId) || riwayaId <= 0) {
      return NextResponse.json(
        { error: "INVALID_RIWAYA_ID" },
        { status: 400 },
      );
    }
    const turuq = await repo.findByRiwayaId(riwayaId);
    return NextResponse.json({ data: turuq });
  }

  const turuq = await repo.findAll();
  return NextResponse.json({ data: turuq });
}

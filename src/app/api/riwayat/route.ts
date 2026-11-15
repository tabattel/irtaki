import { NextResponse } from "next/server";
import { RiwayaRepository } from "@irtaki/persistence";

export async function GET() {
  const repo = new RiwayaRepository();
  const riwayat = await repo.findAll();
  return NextResponse.json({ data: riwayat });
}

import { getRiwayat } from "@/application/riwaya/get-riwayat";
import { NextResponse } from "next/server";

export async function GET() {
  const riwayat = await getRiwayat();

  return NextResponse.json({
    data: riwayat,
  });
}

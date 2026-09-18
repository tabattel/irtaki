import { getRiwayatByQiraa } from "@/application/qiraa/get-riwayat-by-qiraa";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { id } = await context.params;
  const qiraaId = Number(id);

  if (!Number.isInteger(qiraaId) || qiraaId <= 0) {
    return NextResponse.json(
      {
        error: "Invalid qiraa id",
      },
      { status: 400 },
    );
  }

  const riwayat = await getRiwayatByQiraa(qiraaId);

  return NextResponse.json({
    data: riwayat,
  });
}

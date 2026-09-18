import { getTuruqByRiwaya } from "@/application/tariq/get-turuq-by-riwaya";
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
  const riwayaId = Number(id);

  if (!Number.isInteger(riwayaId) || riwayaId <= 0) {
    return NextResponse.json(
      { error: "Invalid riwaya id" },
      { status: 400 },
    );
  }

  const turuq = await getTuruqByRiwaya(riwayaId);

  return NextResponse.json({
    data: turuq,
  });
}

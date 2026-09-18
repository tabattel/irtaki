import { getRiwayaById } from "@/application/riwaya/get-riwaya-by-id";
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

  const riwaya = await getRiwayaById(riwayaId);

  if (!riwaya) {
    return NextResponse.json(
      { error: "Riwaya not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: riwaya,
  });
}

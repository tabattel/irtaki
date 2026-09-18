import { getTariqById } from "@/application/tariq/get-tariq-by-id";
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
  const tariqId = Number(id);

  if (!Number.isInteger(tariqId) || tariqId <= 0) {
    return NextResponse.json(
      { error: "Invalid tariq id" },
      { status: 400 },
    );
  }

  const tariq = await getTariqById(tariqId);

  if (!tariq) {
    return NextResponse.json(
      { error: "Tariq not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: tariq,
  });
}
